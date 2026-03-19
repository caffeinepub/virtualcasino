import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import type { Principal } from "@icp-sdk/core/principal";
import {
  Check,
  Copy,
  Loader2,
  Pencil,
  UserMinus,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import {
  useAddCreditsByUsername,
  useGetFriendRequests,
  useGetFriends,
  useGetMyUsername,
  useRemoveFriend,
  useRespondFriendRequest,
  useSendFriendRequest,
  useSetUsername,
  useValidateUsername,
} from "../hooks/useFriends";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useGetCallerUserProfile,
  useGetWalletBalance,
} from "../hooks/useQueries";

function UsernameRulesHint() {
  return (
    <ul className="text-xs text-muted-foreground mt-1 space-y-0.5">
      <li>• 4–7 characters, no spaces</li>
      <li>• Must contain at least 2 numbers</li>
      <li>• Example: ace22, vip77x</li>
    </ul>
  );
}

export default function ProfilePage() {
  const { identity } = useInternetIdentity();
  const { data: profile } = useGetCallerUserProfile();
  const { data: balance } = useGetWalletBalance();
  const { data: username, isLoading: loadingUsername } = useGetMyUsername();
  const { data: friends = [], isLoading: loadingFriends } = useGetFriends();
  const { data: friendRequests = [], isLoading: loadingRequests } =
    useGetFriendRequests();

  const { mutateAsync: setUsername, isPending: settingUsername } =
    useSetUsername();
  const { mutateAsync: sendFriendRequest, isPending: sendingRequest } =
    useSendFriendRequest();
  const { mutateAsync: respondRequest, isPending: responding } =
    useRespondFriendRequest();
  const { mutateAsync: removeFriend, isPending: removing } = useRemoveFriend();

  const [editingUsername, setEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [addFriendInput, setAddFriendInput] = useState("");
  const [copied, setCopied] = useState(false);

  const validation = useValidateUsername(newUsername);
  const principal = identity?.getPrincipal().toString() ?? "";

  const handleCopy = () => {
    if (!username) return;
    navigator.clipboard.writeText(username).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Username copied to clipboard!");
    });
  };

  const handleSaveUsername = async () => {
    if (!validation.valid) return;
    try {
      await setUsername(newUsername.trim());
      toast.success("Username updated!");
      setEditingUsername(false);
      setNewUsername("");
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to update username");
    }
  };

  const handleSendRequest = async () => {
    const target = addFriendInput.trim();
    if (!target) return;
    try {
      await sendFriendRequest(target);
      toast.success(`Friend request sent to ${target}!`);
      setAddFriendInput("");
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to send friend request");
    }
  };

  const handleRespond = async (fromPrincipal: Principal, accept: boolean) => {
    try {
      await respondRequest({ fromPrincipal, accept });
      toast.success(accept ? "Friend request accepted!" : "Request declined");
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to respond");
    }
  };

  const handleRemoveFriend = async (
    friendPrincipal: Principal,
    friendUsername: string,
  ) => {
    try {
      await removeFriend(friendPrincipal);
      toast.success(`Removed ${friendUsername} from friends`);
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to remove friend");
    }
  };

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        {/* Profile Header */}
        <div
          className="rounded-2xl p-6 relative overflow-hidden"
          style={{
            background: "oklch(0.11 0.015 280)",
            border: "1px solid oklch(0.65 0.28 340 / 0.4)",
            boxShadow: "0 0 30px oklch(0.65 0.28 340 / 0.1)",
          }}
        >
          <div
            className="absolute top-0 left-0 right-0 h-1"
            style={{
              background:
                "linear-gradient(90deg, oklch(0.65 0.28 340), oklch(0.55 0.25 290), oklch(0.70 0.20 190))",
            }}
          />
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black shrink-0"
              style={{
                background:
                  "linear-gradient(135deg, oklch(0.65 0.28 340 / 0.3), oklch(0.55 0.25 290 / 0.3))",
                border: "2px solid oklch(0.65 0.28 340 / 0.5)",
                boxShadow: "0 0 20px oklch(0.65 0.28 340 / 0.2)",
              }}
            >
              🎮
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground tracking-widest font-bold mb-1">
                PLAYER NAME
              </p>
              <h1 className="font-display font-black text-xl text-foreground">
                {profile?.name || "Unnamed Player"}
              </h1>
              <p className="text-xs text-muted-foreground mt-1 font-mono truncate">
                {principal.slice(0, 20)}...
              </p>
            </div>
            <div className="text-right shrink-0" style={{}}>
              <p className="text-xs text-muted-foreground tracking-widest font-bold mb-1">
                BALANCE
              </p>
              <p
                className="font-black text-xl"
                style={{ color: "oklch(0.78 0.18 72)" }}
              >
                {balance?.toString() ?? "—"}
              </p>
              <p className="text-xs text-muted-foreground">credits</p>
            </div>
          </div>
        </div>

        {/* Username Section */}
        <div
          className="rounded-xl p-6"
          style={{
            background: "oklch(0.11 0.015 280)",
            border: "1px solid oklch(0.55 0.25 290 / 0.4)",
          }}
        >
          <h2
            className="font-display font-black tracking-widest text-sm mb-4 flex items-center gap-2"
            style={{ color: "oklch(0.55 0.25 290)" }}
          >
            @ USERNAME
          </h2>

          {loadingUsername ? (
            <div
              className="flex items-center gap-2 py-2"
              data-ocid="profile.username.loading_state"
            >
              <Loader2
                className="w-4 h-4 animate-spin"
                style={{ color: "oklch(0.55 0.25 290)" }}
              />
              <span className="text-sm text-muted-foreground">Loading...</span>
            </div>
          ) : !username && !editingUsername ? (
            <div>
              <p className="text-sm text-muted-foreground mb-3">
                You haven&apos;t set a username yet. Set one to share your
                profile and add friends!
              </p>
              <UsernameRulesHint />
              <Button
                onClick={() => setEditingUsername(true)}
                size="sm"
                className="mt-3 font-black border-none"
                style={{
                  background:
                    "linear-gradient(135deg, oklch(0.55 0.25 290), oklch(0.45 0.22 290))",
                  color: "#fff",
                }}
                data-ocid="profile.username.edit_button"
              >
                <UserPlus className="w-3.5 h-3.5 mr-1" />
                Set Username
              </Button>
            </div>
          ) : !editingUsername ? (
            <div className="flex items-center gap-3">
              <div
                className="flex items-center gap-2 px-4 py-2 rounded-lg flex-1"
                style={{
                  background: "oklch(0.14 0.025 278)",
                  border: "1px solid oklch(0.55 0.25 290 / 0.5)",
                  boxShadow: "0 0 12px oklch(0.55 0.25 290 / 0.1)",
                }}
              >
                <span className="text-sm text-muted-foreground">@</span>
                <span
                  className="font-black text-base tracking-wider"
                  style={{
                    color: "oklch(0.55 0.25 290)",
                    textShadow: "0 0 8px oklch(0.55 0.25 290 / 0.5)",
                  }}
                >
                  {username}
                </span>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleCopy}
                className="shrink-0"
                style={{
                  color: copied
                    ? "oklch(0.70 0.20 190)"
                    : "oklch(0.55 0.15 280)",
                }}
                data-ocid="profile.username.copy_button"
              >
                {copied ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setNewUsername(username ?? "");
                  setEditingUsername(true);
                }}
                className="shrink-0"
                style={{ color: "oklch(0.55 0.15 280)" }}
                data-ocid="profile.username.edit_button"
              >
                <Pencil className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <Label className="text-sm text-muted-foreground">
                  New Username
                </Label>
                <Input
                  value={newUsername}
                  onChange={(e) =>
                    setNewUsername(e.target.value.replace(/\s/g, ""))
                  }
                  placeholder="e.g. ace22"
                  maxLength={7}
                  className="mt-1 bg-secondary border-border text-foreground font-mono"
                  data-ocid="profile.username.input"
                />
                {newUsername && (
                  <p
                    className="text-xs mt-1"
                    style={{
                      color: validation.valid
                        ? "oklch(0.70 0.20 190)"
                        : "oklch(0.65 0.28 340)",
                    }}
                  >
                    {validation.valid ? "✓ Valid username" : validation.error}
                  </p>
                )}
                <UsernameRulesHint />
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleSaveUsername}
                  disabled={!validation.valid || settingUsername}
                  className="font-black border-none"
                  style={{
                    background:
                      "linear-gradient(135deg, oklch(0.55 0.25 290), oklch(0.45 0.22 290))",
                    color: "#fff",
                  }}
                  data-ocid="profile.username.save_button"
                >
                  {settingUsername ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                  ) : null}
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setEditingUsername(false);
                    setNewUsername("");
                  }}
                  style={{ color: "oklch(0.55 0.15 280)" }}
                  data-ocid="profile.username.cancel_button"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Friends Section */}
        <div
          className="rounded-xl p-6"
          style={{
            background: "oklch(0.11 0.015 280)",
            border: "1px solid oklch(0.70 0.20 190 / 0.4)",
          }}
        >
          <h2
            className="font-display font-black tracking-widest text-sm mb-4 flex items-center gap-2"
            style={{ color: "oklch(0.70 0.20 190)" }}
          >
            <Users className="w-4 h-4" />
            FRIENDS
            {friendRequests.length > 0 && (
              <Badge
                className="ml-1 font-black text-xs px-2"
                style={{
                  background: "oklch(0.65 0.28 340)",
                  color: "#fff",
                  boxShadow: "0 0 8px oklch(0.65 0.28 340 / 0.5)",
                }}
              >
                {friendRequests.length} request
                {friendRequests.length !== 1 ? "s" : ""}
              </Badge>
            )}
          </h2>

          {/* Add Friend */}
          <div className="flex gap-2 mb-5">
            <Input
              value={addFriendInput}
              onChange={(e) =>
                setAddFriendInput(e.target.value.replace(/\s/g, ""))
              }
              placeholder="Enter username to add..."
              maxLength={7}
              className="bg-secondary border-border text-foreground font-mono"
              data-ocid="friends.search_input"
              onKeyDown={(e) => e.key === "Enter" && handleSendRequest()}
            />
            <Button
              onClick={handleSendRequest}
              disabled={sendingRequest || !addFriendInput.trim()}
              size="sm"
              className="shrink-0 font-black border-none"
              style={{
                background:
                  "linear-gradient(135deg, oklch(0.70 0.20 190), oklch(0.55 0.20 190))",
                color: "#fff",
              }}
              data-ocid="friends.add_button"
            >
              {sendingRequest ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <UserPlus className="w-3.5 h-3.5" />
              )}
            </Button>
          </div>

          {/* Pending Requests */}
          {loadingRequests ? (
            <div
              className="flex items-center gap-2 py-2"
              data-ocid="friends.requests.loading_state"
            >
              <Loader2
                className="w-4 h-4 animate-spin"
                style={{ color: "oklch(0.65 0.28 340)" }}
              />
            </div>
          ) : friendRequests.length > 0 ? (
            <div className="mb-5">
              <p className="text-xs text-muted-foreground font-bold tracking-widest mb-2">
                PENDING REQUESTS
              </p>
              <div className="space-y-2">
                {friendRequests.map((req, i) => (
                  <motion.div
                    key={req.from.toString()}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg"
                    style={{
                      background: "oklch(0.14 0.025 278)",
                      border: "1px solid oklch(0.65 0.28 340 / 0.3)",
                    }}
                    data-ocid={`friends.request.item.${i + 1}`}
                  >
                    <span
                      className="font-black text-sm flex-1"
                      style={{ color: "oklch(0.55 0.25 290)" }}
                    >
                      @{req.fromUsername}
                    </span>
                    <Button
                      size="sm"
                      onClick={() => handleRespond(req.from, true)}
                      disabled={responding}
                      className="font-black text-xs border-none px-3"
                      style={{
                        background: "oklch(0.70 0.20 190 / 0.2)",
                        color: "oklch(0.70 0.20 190)",
                        border: "1px solid oklch(0.70 0.20 190 / 0.4)",
                      }}
                      data-ocid={`friends.request.confirm_button.${i + 1}`}
                    >
                      <Check className="w-3.5 h-3.5 mr-1" />
                      Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRespond(req.from, false)}
                      disabled={responding}
                      className="font-black text-xs"
                      style={{ color: "oklch(0.65 0.28 340)" }}
                      data-ocid={`friends.request.cancel_button.${i + 1}`}
                    >
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </motion.div>
                ))}
              </div>
            </div>
          ) : null}

          <Separator
            className="mb-4"
            style={{ background: "oklch(0.70 0.20 190 / 0.2)" }}
          />

          {/* Friends List */}
          {loadingFriends ? (
            <div
              className="flex items-center gap-2 py-2"
              data-ocid="friends.list.loading_state"
            >
              <Loader2
                className="w-4 h-4 animate-spin"
                style={{ color: "oklch(0.70 0.20 190)" }}
              />
            </div>
          ) : friends.length === 0 ? (
            <div
              className="text-center py-8"
              data-ocid="friends.list.empty_state"
            >
              <p className="text-3xl mb-2">👥</p>
              <p className="text-sm text-muted-foreground">
                No friends yet. Add someone by their username!
              </p>
            </div>
          ) : (
            <div className="space-y-2" data-ocid="friends.list">
              {friends.map((friend, i) => (
                <motion.div
                  key={friend.principal.toString()}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg"
                  style={{
                    background: "oklch(0.14 0.025 278)",
                    border: "1px solid oklch(0.70 0.20 190 / 0.2)",
                  }}
                  data-ocid={`friends.item.${i + 1}`}
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black shrink-0"
                    style={{
                      background: "oklch(0.70 0.20 190 / 0.15)",
                      color: "oklch(0.70 0.20 190)",
                    }}
                  >
                    {friend.username[0]?.toUpperCase() ?? "?"}
                  </div>
                  <span
                    className="font-black text-sm flex-1"
                    style={{ color: "oklch(0.70 0.20 190)" }}
                  >
                    @{friend.username}
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      handleRemoveFriend(friend.principal, friend.username)
                    }
                    disabled={removing}
                    className="text-xs"
                    style={{ color: "oklch(0.65 0.28 340 / 0.6)" }}
                    data-ocid={`friends.delete_button.${i + 1}`}
                  >
                    <UserMinus className="w-3.5 h-3.5" />
                  </Button>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
