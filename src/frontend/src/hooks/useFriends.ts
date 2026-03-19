import type { Principal } from "@icp-sdk/core/principal";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useActor } from "./useActor";
import { useInternetIdentity } from "./useInternetIdentity";

export function useGetMyUsername() {
  const { actor, isFetching } = useActor();
  const { identity } = useInternetIdentity();
  return useQuery<string | null>({
    queryKey: ["myUsername"],
    queryFn: async () => {
      if (!actor || !identity) return null;
      const principal = identity.getPrincipal();
      return actor.getUsernameByPrincipal(principal);
    },
    enabled: !!actor && !isFetching && !!identity,
  });
}

export function useSetUsername() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (username: string) => {
      if (!actor) throw new Error("Not connected");
      return actor.setUsername(username);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["myUsername"] });
      qc.invalidateQueries({ queryKey: ["currentUserProfile"] });
    },
  });
}

export function useGetFriends() {
  const { actor, isFetching } = useActor();
  const { identity } = useInternetIdentity();
  return useQuery({
    queryKey: ["friends"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getFriends();
    },
    enabled: !!actor && !isFetching && !!identity,
    refetchInterval: 15000,
  });
}

export function useGetFriendRequests() {
  const { actor, isFetching } = useActor();
  const { identity } = useInternetIdentity();
  return useQuery({
    queryKey: ["friendRequests"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getFriendRequests();
    },
    enabled: !!actor && !isFetching && !!identity,
    refetchInterval: 15000,
  });
}

export function useSendFriendRequest() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (toUsername: string) => {
      if (!actor) throw new Error("Not connected");
      return actor.sendFriendRequest(toUsername);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["friends"] });
    },
  });
}

export function useRespondFriendRequest() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      fromPrincipal,
      accept,
    }: { fromPrincipal: Principal; accept: boolean }) => {
      if (!actor) throw new Error("Not connected");
      return actor.respondFriendRequest(fromPrincipal, accept);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["friendRequests"] });
      qc.invalidateQueries({ queryKey: ["friends"] });
    },
  });
}

export function useRemoveFriend() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (friendPrincipal: Principal) => {
      if (!actor) throw new Error("Not connected");
      return actor.removeFriend(friendPrincipal);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["friends"] });
    },
  });
}

export function useAddCreditsByUsername() {
  const { actor } = useActor();
  return useMutation({
    mutationFn: async ({
      username,
      amount,
    }: { username: string; amount: bigint }) => {
      if (!actor) throw new Error("Not connected");
      return actor.addCreditsByUsername(username, amount);
    },
  });
}

export function useValidateUsername(username: string): {
  valid: boolean;
  error: string;
} {
  if (!username) return { valid: false, error: "" };
  if (username.includes(" "))
    return { valid: false, error: "No spaces allowed" };
  if (username.length < 4)
    return { valid: false, error: "Minimum 4 characters" };
  if (username.length > 7)
    return { valid: false, error: "Maximum 7 characters" };
  const digitCount = (username.match(/\d/g) || []).length;
  if (digitCount < 2)
    return { valid: false, error: "Must include at least 2 numbers" };
  return { valid: true, error: "" };
}
