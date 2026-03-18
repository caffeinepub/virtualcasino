import type { Principal } from "@icp-sdk/core/principal";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  GameSettings,
  GameType,
  UserProfile,
  UserRole,
} from "../backend.d";
import { useActor } from "./useActor";
import { useInternetIdentity } from "./useInternetIdentity";

export function useGetCallerUserProfile() {
  const { actor, isFetching: actorFetching } = useActor();
  const query = useQuery<UserProfile | null>({
    queryKey: ["currentUserProfile"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.getCallerUserProfile();
    },
    enabled: !!actor && !actorFetching,
    retry: false,
  });
  return {
    ...query,
    isLoading: actorFetching || query.isLoading,
    isFetched: !!actor && query.isFetched,
  };
}

export function useGetWalletBalance() {
  const { actor, isFetching } = useActor();
  const { identity } = useInternetIdentity();
  return useQuery<bigint>({
    queryKey: ["walletBalance"],
    queryFn: async () => {
      if (!actor) return BigInt(0);
      return actor.getWalletBalance();
    },
    enabled: !!actor && !isFetching && !!identity,
    refetchInterval: 10000,
  });
}

export function useGetCallerUserRole() {
  const { actor, isFetching } = useActor();
  const { identity } = useInternetIdentity();
  return useQuery<UserRole>({
    queryKey: ["callerUserRole"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.getCallerUserRole();
    },
    enabled: !!actor && !isFetching && !!identity,
  });
}

export function useIsCallerAdmin() {
  const { actor, isFetching } = useActor();
  const { identity } = useInternetIdentity();
  return useQuery<boolean>({
    queryKey: ["isCallerAdmin"],
    queryFn: async () => {
      if (!actor) return false;
      return actor.isCallerAdmin();
    },
    enabled: !!actor && !isFetching && !!identity,
  });
}

export function useGetDailyWinners() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["dailyWinners"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getDailyWinners();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetGameHistory(user: Principal | undefined) {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["gameHistory", user?.toString()],
    queryFn: async () => {
      if (!actor || !user) return [];
      return actor.getGameHistory(user);
    },
    enabled: !!actor && !isFetching && !!user,
  });
}

export function useClaimDailyCredits() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("Not connected");
      return actor.claimDailyCredits();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["walletBalance"] });
    },
  });
}

export function useInitializeBalance() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("Not connected");
      return actor.initializeBalance();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["walletBalance"] });
    },
  });
}

export function useSaveCallerUserProfile() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (profile: UserProfile) => {
      if (!actor) throw new Error("Not connected");
      return actor.saveCallerUserProfile(profile);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["currentUserProfile"] });
    },
  });
}

export function usePlayGame() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      gameType,
      bet,
    }: { gameType: GameType; bet: bigint }) => {
      if (!actor) throw new Error("Not connected");
      return actor.playGame(gameType, bet);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["walletBalance"] });
      qc.invalidateQueries({ queryKey: ["gameHistory"] });
      qc.invalidateQueries({ queryKey: ["dailyWinners"] });
    },
  });
}

export function useAddCredits() {
  const { actor } = useActor();
  return useMutation({
    mutationFn: async ({
      user,
      amount,
    }: { user: Principal; amount: bigint }) => {
      if (!actor) throw new Error("Not connected");
      return actor.addCredits(user, amount);
    },
  });
}

export function useAssignRole() {
  const { actor } = useActor();
  return useMutation({
    mutationFn: async ({ user, role }: { user: Principal; role: UserRole }) => {
      if (!actor) throw new Error("Not connected");
      return actor.assignCallerUserRole(user, role);
    },
  });
}

export function useGetAllUsers() {
  const { actor, isFetching } = useActor();
  const { identity } = useInternetIdentity();
  return useQuery({
    queryKey: ["allUsers"],
    queryFn: async () => {
      if (!actor) return [];
      return (actor as any).getAllUsers();
    },
    enabled: !!actor && !isFetching && !!identity,
  });
}

export function useGetAllGameSettings() {
  const { actor, isFetching } = useActor();
  return useQuery<Array<[string, GameSettings]>>({
    queryKey: ["allGameSettings"],
    queryFn: async () => {
      if (!actor) return [];
      return (actor as any).getAllGameSettings();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useSetGameSettings() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      gameType,
      settings,
    }: { gameType: GameType; settings: GameSettings }) => {
      if (!actor) throw new Error("Not connected");
      return (actor as any).setGameSettings(gameType, settings);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["allGameSettings"] });
    },
  });
}
