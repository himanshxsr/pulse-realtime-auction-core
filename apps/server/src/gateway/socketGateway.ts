import type {
  AuctionState,
  BidSubmissionPayload,
  ClientToServerEvents,
  CommentaryMessage,
  JoinRoomPayload,
  ServerToClientEvents,
} from '@pulse/shared-types';
import { createAdapter } from '@socket.io/redis-adapter';
import { Server as HttpServer } from 'node:http';
import { Server, type Socket } from 'socket.io';
import { pubClient, subClient } from '../config/redis.js';
import { bidEngine } from '../services/bidEngine.js';

export function formatInrCurrency(amountCents: number): string {
  const rupees = amountCents / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(rupees);
}

let ioInstance: Server<ClientToServerEvents, ServerToClientEvents> | null = null;

export function setupSocketGateway(httpServer: HttpServer): Server<ClientToServerEvents, ServerToClientEvents> {
  const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
    adapter: createAdapter(pubClient, subClient),
  });

  ioInstance = io;

  const roomParticipants = new Map<string, Set<string>>();

  io.on('connection', (socket: Socket<ClientToServerEvents, ServerToClientEvents>) => {
    console.log(`[SocketGateway] Client connected: ${socket.id}`);

    const handleRoomJoin = async ({ auctionId }: JoinRoomPayload) => {
      const roomKey = `auction:${auctionId}`;
      await socket.join(roomKey);

      if (!roomParticipants.has(auctionId)) {
        roomParticipants.set(auctionId, new Set());
      }
      roomParticipants.get(auctionId)!.add(socket.id);

      const activeCount = roomParticipants.get(auctionId)?.size ?? 1;

      const state = await bidEngine.getAuctionState(auctionId);
      if (state) {
        socket.emit('auction:state', state);
      }

      io.to(roomKey).emit('room:count', {
        auctionId,
        activeBiddersCount: activeCount,
      });
    };

    socket.on('room:join', handleRoomJoin);
    socket.on('auction:join', handleRoomJoin);

    socket.on('room:leave', async ({ auctionId }) => {
      const roomKey = `auction:${auctionId}`;
      await socket.leave(roomKey);

      if (roomParticipants.has(auctionId)) {
        roomParticipants.get(auctionId)!.delete(socket.id);
        const activeCount = roomParticipants.get(auctionId)?.size ?? 0;
        io.to(roomKey).emit('room:count', {
          auctionId,
          activeBiddersCount: activeCount,
        });
      }
    });

    const handleBidSubmission = async (payload: BidSubmissionPayload) => {
      console.log('[Gateway] Received bid:', payload);

      const result = await bidEngine.submitBid(payload);
      console.log('[Gateway] Bid resolution result from Lua:', result);

      if (result.success) {
        const updatedState = await bidEngine.getAuctionState(payload.auctionId);

        if (updatedState) {
          const newBidRecord = {
            id: `${payload.auctionId}-${Date.now()}`,
            auctionId: payload.auctionId,
            bidderId: payload.bidderId,
            bidderName: payload.bidderName,
            amountCents: payload.amountCents,
            timestamp: Date.now(),
          };

          const roomKey = `auction:${payload.auctionId}`;

          io.to(roomKey).emit('bid:accepted', {
            auctionId: payload.auctionId,
            bid: newBidRecord,
            newState: updatedState,
            wasExtended: result.wasExtended ?? false,
          });

          const commentary: CommentaryMessage = {
            id: `comm-${Date.now()}`,
            auctionId: payload.auctionId,
            text: `${payload.bidderName} raised the paddle to ${formatInrCurrency(payload.amountCents)}`,
            timestamp: Date.now(),
            type: 'BID',
          };
          io.to(roomKey).emit('auction:commentary', commentary);

          if (result.wasExtended) {
            const extensionCommentary: CommentaryMessage = {
              id: `comm-ext-${Date.now()}`,
              auctionId: payload.auctionId,
              text: '⏱️ Fair-Play Extension: +60 seconds added to give all bidders a fair chance to counter.',
              timestamp: Date.now(),
              type: 'ANTI_SNIPE',
            };
            io.to(roomKey).emit('auction:commentary', extensionCommentary);
          }

          if (result.previousLeaderId && result.previousLeaderId !== payload.bidderId) {
            io.to(roomKey).emit('bid:outbid', {
              auctionId: payload.auctionId,
              previousLeaderId: result.previousLeaderId,
              currentPriceCents: result.currentPriceCents ?? payload.amountCents,
              minIncrementCents: result.minIncrementCents ?? 2500000,
            });
          }
        }
      } else {
        console.warn(
          `[Gateway] Emitting bid:rejected to sender (code: ${result.code}, reason: ${result.reason})`
        );
        socket.emit('bid:rejected', {
          auctionId: payload.auctionId,
          reason: result.reason ?? 'Bid rejected by engine',
          code: result.code,
          currentPriceCents: result.currentPriceCents,
          minIncrementCents: result.minIncrementCents,
        });
      }
    };

    socket.on('bid:submit', handleBidSubmission);
    socket.on('auction:bid', handleBidSubmission);

    socket.on('auction:reset', async (data: { auctionId: string; durationMinutes?: number }) => {
      console.log('[SocketGateway] Received auction:reset request:', data);
      const duration = data.durationMinutes || 5;
      const updatedState = await bidEngine.resetDemoAuction(data.auctionId, duration);
      const roomKey = `auction:${data.auctionId}`;
      io.to(roomKey).emit('auction:state', updatedState);
      const commentary: CommentaryMessage = {
        id: `commentary_${Date.now()}`,
        auctionId: data.auctionId,
        text: `🔄 Auction clock reset for ${duration} minutes. Bidding is now LIVE!`,
        timestamp: Date.now(),
        type: 'BID',
      };
      io.to(roomKey).emit('auction:commentary', commentary);
    });

    socket.on('disconnect', () => {
      console.log(`[SocketGateway] Client disconnected: ${socket.id}`);
      for (const [auctionId, participants] of roomParticipants.entries()) {
        if (participants.has(socket.id)) {
          participants.delete(socket.id);
          const roomKey = `auction:${auctionId}`;
          io.to(roomKey).emit('room:count', {
            auctionId,
            activeBiddersCount: participants.size,
          });
        }
      }
    });
  });

  return io;
}

export function broadcastAuctionState(auctionId: string, state: AuctionState): void {
  if (ioInstance) {
    const roomKey = `auction:${auctionId}`;
    ioInstance.to(roomKey).emit('auction:state', state);
    const commentary: CommentaryMessage = {
      id: `comm-reset-${Date.now()}`,
      auctionId,
      text: `🔄 Demo auction timer has been reset to ACTIVE state (${formatInrCurrency(state.currentPriceCents)}).`,
      timestamp: Date.now(),
      type: 'CALL',
    };
    ioInstance.to(roomKey).emit('auction:commentary', commentary);
  }
}
