import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Principal } from "@icp-sdk/core/principal";
import { CreditCard, Loader2, ShieldAlert, Users } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { UserRole } from "../backend.d";
import {
  useAddCredits,
  useAssignRole,
  useIsCallerAdmin,
} from "../hooks/useQueries";

export default function StaffPage() {
  const { data: isAdmin, isLoading } = useIsCallerAdmin();
  const { mutateAsync: addCredits, isPending: addingCredits } = useAddCredits();
  const { mutateAsync: assignRole, isPending: assigningRole } = useAssignRole();

  const [creditPrincipal, setCreditPrincipal] = useState("");
  const [creditAmount, setCreditAmount] = useState("");
  const [rolePrincipal, setRolePrincipal] = useState("");
  const [selectedRole, setSelectedRole] = useState<UserRole>(UserRole.user);

  const handleAddCredits = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const user = Principal.fromText(creditPrincipal.trim());
      const amount = BigInt(Number.parseInt(creditAmount, 10));
      await addCredits({ user, amount });
      toast.success(`Added ${creditAmount} credits to user`);
      setCreditPrincipal("");
      setCreditAmount("");
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to add credits");
    }
  };

  const handleAssignRole = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const user = Principal.fromText(rolePrincipal.trim());
      await assignRole({ user, role: selectedRole });
      toast.success(`Role '${selectedRole}' assigned successfully`);
      setRolePrincipal("");
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to assign role");
    }
  };

  if (isLoading) {
    return (
      <div
        className="flex justify-center py-20"
        data-ocid="staff.loading_state"
      >
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div
        className="flex flex-col items-center justify-center py-20 px-4"
        data-ocid="staff.error_state"
      >
        <ShieldAlert className="w-16 h-16 text-destructive mb-4" />
        <h2 className="font-display text-2xl font-bold mb-2">Access Denied</h2>
        <p className="text-muted-foreground text-center">
          You don't have permission to access the Staff Panel.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-2 mb-6">
          <Users className="w-6 h-6 text-gold" />
          <h1 className="font-display text-2xl font-bold tracking-wider">
            STAFF PANEL
          </h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Add Credits */}
          <div className="card-dark rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <CreditCard className="w-5 h-5 text-gold" />
              <h2 className="font-display font-bold tracking-wider">
                ADD CREDITS
              </h2>
            </div>
            <form onSubmit={handleAddCredits} className="space-y-4">
              <div>
                <Label
                  htmlFor="credit-principal"
                  className="text-sm text-muted-foreground"
                >
                  User Principal ID
                </Label>
                <Input
                  id="credit-principal"
                  value={creditPrincipal}
                  onChange={(e) => setCreditPrincipal(e.target.value)}
                  placeholder="e.g. aaaaa-aa"
                  className="mt-1 bg-secondary border-border text-foreground font-mono text-xs"
                  data-ocid="staff.credit.principal.input"
                />
              </div>
              <div>
                <Label
                  htmlFor="credit-amount"
                  className="text-sm text-muted-foreground"
                >
                  Amount (credits)
                </Label>
                <Input
                  id="credit-amount"
                  type="number"
                  min="1"
                  value={creditAmount}
                  onChange={(e) => setCreditAmount(e.target.value)}
                  placeholder="e.g. 100"
                  className="mt-1 bg-secondary border-border text-foreground"
                  data-ocid="staff.credit.amount.input"
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-gold text-primary-foreground font-bold hover:opacity-90"
                disabled={addingCredits || !creditPrincipal || !creditAmount}
                data-ocid="staff.credit.submit_button"
              >
                {addingCredits ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                Add Credits
              </Button>
            </form>
          </div>

          {/* Assign Role */}
          <div className="card-dark rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <ShieldAlert className="w-5 h-5 text-gold" />
              <h2 className="font-display font-bold tracking-wider">
                ASSIGN ROLE
              </h2>
            </div>
            <form onSubmit={handleAssignRole} className="space-y-4">
              <div>
                <Label
                  htmlFor="role-principal"
                  className="text-sm text-muted-foreground"
                >
                  User Principal ID
                </Label>
                <Input
                  id="role-principal"
                  value={rolePrincipal}
                  onChange={(e) => setRolePrincipal(e.target.value)}
                  placeholder="e.g. aaaaa-aa"
                  className="mt-1 bg-secondary border-border text-foreground font-mono text-xs"
                  data-ocid="staff.role.principal.input"
                />
              </div>
              <div>
                <Label
                  htmlFor="role-select"
                  className="text-sm text-muted-foreground"
                >
                  Role
                </Label>
                <Select
                  value={selectedRole}
                  onValueChange={(v) => setSelectedRole(v as UserRole)}
                >
                  <SelectTrigger
                    id="role-select"
                    className="mt-1 bg-secondary border-border"
                    data-ocid="staff.role.select"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent
                    style={{
                      background: "oklch(0.16 0.018 228)",
                      borderColor: "oklch(0.22 0.025 225)",
                    }}
                  >
                    <SelectItem value={UserRole.user}>User</SelectItem>
                    <SelectItem value={UserRole.admin}>Admin</SelectItem>
                    <SelectItem value={UserRole.guest}>Guest</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                type="submit"
                className="w-full bg-gold text-primary-foreground font-bold hover:opacity-90"
                disabled={assigningRole || !rolePrincipal}
                data-ocid="staff.role.submit_button"
              >
                {assigningRole ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                Assign Role
              </Button>
            </form>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
