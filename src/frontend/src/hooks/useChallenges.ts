import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { GameChallenge, GameType } from "../backend.d";
import { useActor } from "./useActor";
import { useInternetIdentity } from "./useInternetIdentity";

export function useGetPendingChallenges() {
  const { actor, isFetching } = useActor();
  const { identity } = useInternetIdentity();
  return useQuery<GameChallenge[]>({
    queryKey: ["pendingChallenges"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getPendingChallenges();
    },
    enabled: !!actor && !isFetching && !!identity,
    refetchInterval: 30000,
  });
}

export function useGetSentChallenges() {
  const { actor, isFetching } = useActor();
  const { identity } = useInternetIdentity();
  return useQuery<GameChallenge[]>({
    queryKey: ["sentChallenges"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getSentChallenges();
    },
    enabled: !!actor && !isFetching && !!identity,
    refetchInterval: 30000,
  });
}

export function useSendGameChallenge() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      toUsername,
      gameType,
      bet,
    }: { toUsername: string; gameType: GameType; bet: bigint }) => {
      if (!actor) throw new Error("Not connected");
      return actor.sendGameChallenge(toUsername, gameType, bet);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sentChallenges"] });
    },
  });
}

export function useRespondGameChallenge() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      challengeId,
      accept,
    }: { challengeId: string; accept: boolean }) => {
      if (!actor) throw new Error("Not connected");
      return actor.respondGameChallenge(challengeId, accept);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pendingChallenges"] });
      qc.invalidateQueries({ queryKey: ["pendingChallengeCount"] });
    },
  });
}

export function useCancelGameChallenge() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (challengeId: string) => {
      if (!actor) throw new Error("Not connected");
      return actor.cancelGameChallenge(challengeId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sentChallenges"] });
    },
  });
}

export function useGetPendingChallengeCount() {
  const { actor, isFetching } = useActor();
  const { identity } = useInternetIdentity();
  return useQuery<number>({
    queryKey: ["pendingChallengeCount"],
    queryFn: async () => {
      if (!actor) return 0;
      const challenges = await actor.getPendingChallenges();
      return challenges.length;
    },
    enabled: !!actor && !isFetching && !!identity,
    refetchInterval: 30000,
  });
}
