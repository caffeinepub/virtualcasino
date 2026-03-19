import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Crown, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useSetUsername, useValidateUsername } from "../hooks/useFriends";
import {
  useInitializeBalance,
  useSaveCallerUserProfile,
} from "../hooks/useQueries";

interface ProfileSetupProps {
  open: boolean;
  isNewUser: boolean;
  onComplete: () => void;
}

export default function ProfileSetup({
  open,
  isNewUser,
  onComplete,
}: ProfileSetupProps) {
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const { mutateAsync: saveProfile, isPending: saving } =
    useSaveCallerUserProfile();
  const { mutateAsync: initBalance, isPending: initing } =
    useInitializeBalance();
  const { mutateAsync: setUsernameAction, isPending: settingUsername } =
    useSetUsername();

  const usernameValidation = useValidateUsername(username);
  const isPending = saving || initing || settingUsername;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (username && !usernameValidation.valid) return;
    try {
      await saveProfile({ name: name.trim(), username: username.trim() });
      if (isNewUser) {
        await initBalance();
        toast.success("Welcome! You've received 10 starting credits!");
      }
      if (username.trim()) {
        try {
          await setUsernameAction(username.trim());
        } catch {
          // non-fatal; user can set it from profile later
        }
      }
      onComplete();
    } catch {
      toast.error("Failed to save profile");
    }
  };

  return (
    <Dialog open={open} data-ocid="profile.dialog">
      <DialogContent
        className="max-w-md"
        style={{
          background: "oklch(0.11 0.015 280)",
          border: "1px solid oklch(0.65 0.28 340 / 0.4)",
          boxShadow: "0 0 40px oklch(0.65 0.28 340 / 0.15)",
        }}
      >
        <DialogHeader>
          <div className="flex justify-center mb-4">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{
                background:
                  "linear-gradient(135deg, oklch(0.65 0.28 340), oklch(0.55 0.25 290))",
                boxShadow: "0 0 20px oklch(0.65 0.28 340 / 0.5)",
              }}
            >
              <Crown className="w-8 h-8" style={{ color: "#fff" }} />
            </div>
          </div>
          <DialogTitle
            className="text-center text-2xl font-display font-black tracking-widest"
            style={{
              background:
                "linear-gradient(90deg, oklch(0.65 0.28 340), oklch(0.78 0.18 72))",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            {isNewUser ? "JOIN THE GAME" : "SETUP PROFILE"}
          </DialogTitle>
          <DialogDescription className="text-center text-muted-foreground">
            {isNewUser
              ? "Create your player profile and receive 10 starting credits!"
              : "Complete your profile to continue"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div>
            <Label htmlFor="player-name" className="text-foreground font-bold">
              Player Name
            </Label>
            <Input
              id="player-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your casino name..."
              className="mt-1 bg-secondary border-border text-foreground"
              data-ocid="profile.input"
            />
          </div>
          <div>
            <Label
              htmlFor="player-username"
              className="text-foreground font-bold"
            >
              Username{" "}
              <span className="text-muted-foreground font-normal">
                (optional — can set later)
              </span>
            </Label>
            <Input
              id="player-username"
              value={username}
              onChange={(e) => setUsername(e.target.value.replace(/\s/g, ""))}
              placeholder="e.g. ace22"
              maxLength={7}
              className="mt-1 bg-secondary border-border text-foreground font-mono"
              data-ocid="profile.username.input"
            />
            {username && (
              <p
                className="text-xs mt-1"
                style={{
                  color: usernameValidation.valid
                    ? "oklch(0.70 0.20 190)"
                    : "oklch(0.65 0.28 340)",
                }}
              >
                {usernameValidation.valid
                  ? "✓ Valid username"
                  : usernameValidation.error}
              </p>
            )}
            <ul className="text-xs text-muted-foreground mt-1.5 space-y-0.5">
              <li>• 4–7 chars, no spaces, at least 2 numbers</li>
              <li>• Example: ace22, vip77x</li>
            </ul>
          </div>
          <Button
            type="submit"
            className="w-full font-black tracking-widest border-none"
            style={{
              background:
                "linear-gradient(135deg, oklch(0.65 0.28 340), oklch(0.55 0.25 290))",
              boxShadow: "0 0 20px oklch(0.65 0.28 340 / 0.4)",
              color: "#fff",
            }}
            disabled={
              isPending ||
              !name.trim() ||
              (!!username && !usernameValidation.valid)
            }
            data-ocid="profile.submit_button"
          >
            {isPending ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : null}
            {isNewUser ? "🎮 Join & Claim 10 Credits" : "Save Profile"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
