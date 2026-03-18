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
  const { mutateAsync: saveProfile, isPending: saving } =
    useSaveCallerUserProfile();
  const { mutateAsync: initBalance, isPending: initing } =
    useInitializeBalance();

  const isPending = saving || initing;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await saveProfile({ name: name.trim() });
      if (isNewUser) {
        await initBalance();
        toast.success("Welcome! You've received 10 starting credits!");
      }
      onComplete();
    } catch {
      toast.error("Failed to save profile");
    }
  };

  return (
    <Dialog open={open} data-ocid="profile.dialog">
      <DialogContent
        className="card-dark border-border max-w-md"
        style={{ background: "oklch(0.14 0.015 230)" }}
      >
        <DialogHeader>
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-gold flex items-center justify-center glow-gold">
              <Crown
                className="w-8 h-8"
                style={{ color: "oklch(0.10 0.012 240)" }}
              />
            </div>
          </div>
          <DialogTitle className="text-center text-2xl font-display text-gold-gradient">
            Welcome to Onyx Casino
          </DialogTitle>
          <DialogDescription className="text-center text-muted-foreground">
            {isNewUser
              ? "Create your player profile and receive 10 starting credits!"
              : "Complete your profile to continue"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div>
            <Label htmlFor="player-name" className="text-foreground">
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
          <Button
            type="submit"
            className="w-full bg-gold text-primary-foreground font-bold hover:opacity-90"
            disabled={isPending || !name.trim()}
            data-ocid="profile.submit_button"
          >
            {isPending ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : null}
            {isNewUser ? "Join & Claim 10 Credits" : "Save Profile"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
