import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useActor } from "./useActor";
import { useInternetIdentity } from "./useInternetIdentity";

export type MatchType = "ranked" | "unranked" | "challenge";
export type MatchStatus = "waiting" | "active" | "completed" | "abandoned";

export interface Match {
  id: string;
  gameType: string;
  player1: any;
  player2: { __kind__: "Some"; value: any } | { __kind__: "None" };
  bet: bigint;
  matchType: MatchType;
  status: MatchStatus;
  gameState: string;
  player1Score: { __kind__: "Some"; value: bigint } | { __kind__: "None" };
  player2Score: { __kind__: "Some"; value: bigint } | { __kind__: "None" };
  winner: { __kind__: "Some"; value: any } | { __kind__: "None" };
  createdAt: bigint;
  lastActionAt: bigint;
  turnPlayer: { __kind__: "Some"; value: any } | { __kind__: "None" };
  opponentUsername: { __kind__: "Some"; value: string } | { __kind__: "None" };
}

export function unwrapOption<T>(
  opt: { __kind__: "Some"; value: T } | { __kind__: "None" } | undefined | null,
): T | null {
  if (!opt || opt.__kind__ === "None") return null;
  return opt.value;
}

export function useGetOpenMatches() {
  const { actor, isFetching } = useActor();
  const { identity } = useInternetIdentity();
  return useQuery<Match[]>({
    queryKey: ["openMatches"],
    queryFn: async () => {
      if (!actor) return [];
      return (actor as any).getOpenMatches();
    },
    enabled: !!actor && !isFetching && !!identity,
    refetchInterval: 15000,
  });
}

export function useGetMyMatches() {
  const { actor, isFetching } = useActor();
  const { identity } = useInternetIdentity();
  return useQuery<Match[]>({
    queryKey: ["myMatches"],
    queryFn: async () => {
      if (!actor) return [];
      return (actor as any).getMyMatches();
    },
    enabled: !!actor && !isFetching && !!identity,
    refetchInterval: 15000,
  });
}

export function useGetPendingTurnCount() {
  const { actor, isFetching } = useActor();
  const { identity } = useInternetIdentity();
  return useQuery<bigint>({
    queryKey: ["pendingTurnCount"],
    queryFn: async () => {
      if (!actor) return BigInt(0);
      return (actor as any).getPendingTurnCount();
    },
    enabled: !!actor && !isFetching && !!identity,
    refetchInterval: 30000,
  });
}

export function useGetUserRank() {
  const { actor, isFetching } = useActor();
  const { identity } = useInternetIdentity();
  return useQuery<string>({
    queryKey: ["userRank"],
    queryFn: async () => {
      if (!actor || !identity) return "Bronze";
      return (actor as any).getUserRank(identity.getPrincipal());
    },
    enabled: !!actor && !isFetching && !!identity,
  });
}

export function useGetMatch(matchId: string | null) {
  const { actor, isFetching } = useActor();
  const { identity } = useInternetIdentity();
  return useQuery<Match | null>({
    queryKey: ["match", matchId],
    queryFn: async () => {
      if (!actor || !matchId) return null;
      return (actor as any).getMatch(matchId);
    },
    enabled: !!actor && !isFetching && !!identity && !!matchId,
    refetchInterval: 5000,
  });
}

export function useCreateMatch() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      gameType,
      bet,
      matchType,
      opponentUsername,
    }: {
      gameType: string;
      bet: bigint;
      matchType: MatchType;
      opponentUsername: string | null;
    }) => {
      if (!actor) throw new Error("Not connected");
      const oppOpt = opponentUsername
        ? { __kind__: "Some", value: opponentUsername }
        : { __kind__: "None" };
      return (actor as any).createMatch(gameType, bet, matchType, oppOpt);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["openMatches"] });
      qc.invalidateQueries({ queryKey: ["myMatches"] });
      qc.invalidateQueries({ queryKey: ["walletBalance"] });
    },
  });
}

export function useJoinMatch() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (matchId: string) => {
      if (!actor) throw new Error("Not connected");
      return (actor as any).joinMatch(matchId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["openMatches"] });
      qc.invalidateQueries({ queryKey: ["myMatches"] });
      qc.invalidateQueries({ queryKey: ["walletBalance"] });
    },
  });
}

export function useSubmitTurn() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      matchId,
      gameState,
      isComplete,
      callerScore,
    }: {
      matchId: string;
      gameState: string;
      isComplete: boolean;
      callerScore: bigint | null;
    }) => {
      if (!actor) throw new Error("Not connected");
      const scoreOpt =
        callerScore !== null
          ? { __kind__: "Some", value: callerScore }
          : { __kind__: "None" };
      return (actor as any).submitTurn(
        matchId,
        gameState,
        isComplete,
        scoreOpt,
      );
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["match", vars.matchId] });
      qc.invalidateQueries({ queryKey: ["myMatches"] });
      qc.invalidateQueries({ queryKey: ["pendingTurnCount"] });
      qc.invalidateQueries({ queryKey: ["walletBalance"] });
    },
  });
}

export function useSubmitArcadeScore() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      matchId,
      score,
    }: { matchId: string; score: bigint }) => {
      if (!actor) throw new Error("Not connected");
      return (actor as any).submitArcadeScore(matchId, score);
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["match", vars.matchId] });
      qc.invalidateQueries({ queryKey: ["myMatches"] });
      qc.invalidateQueries({ queryKey: ["pendingTurnCount"] });
      qc.invalidateQueries({ queryKey: ["walletBalance"] });
    },
  });
}

export function useForfeitMatch() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (matchId: string) => {
      if (!actor) throw new Error("Not connected");
      return (actor as any).forfeitMatch(matchId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["myMatches"] });
      qc.invalidateQueries({ queryKey: ["walletBalance"] });
    },
  });
}

export function useCancelMatch() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (matchId: string) => {
      if (!actor) throw new Error("Not connected");
      return (actor as any).cancelMatch(matchId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["openMatches"] });
      qc.invalidateQueries({ queryKey: ["myMatches"] });
      qc.invalidateQueries({ queryKey: ["walletBalance"] });
    },
  });
}
