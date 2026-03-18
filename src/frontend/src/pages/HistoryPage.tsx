import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { History, Loader2 } from "lucide-react";
import { motion } from "motion/react";
import { GameResult } from "../backend.d";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { useGetGameHistory } from "../hooks/useQueries";

function formatDate(ts: bigint): string {
  const ms = Number(ts / BigInt(1_000_000));
  return new Date(ms).toLocaleString();
}

export default function HistoryPage() {
  const { identity } = useInternetIdentity();
  const principal = identity?.getPrincipal();
  const { data: history, isLoading } = useGetGameHistory(principal);

  const sorted = history
    ? [...history].sort((a, b) => Number(b.timestamp - a.timestamp))
    : [];

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div
          className="flex items-center gap-3 mb-6 p-4 rounded-xl"
          style={{
            background: "oklch(0.11 0.015 280)",
            border: "1px solid oklch(0.70 0.20 190 / 0.4)",
            boxShadow: "0 0 20px oklch(0.70 0.20 190 / 0.1)",
          }}
        >
          <History
            className="w-6 h-6"
            style={{
              color: "oklch(0.70 0.20 190)",
              filter: "drop-shadow(0 0 6px oklch(0.70 0.20 190 / 0.7))",
            }}
          />
          <div>
            <h1
              className="font-display font-black text-2xl tracking-widest"
              style={{
                color: "oklch(0.70 0.20 190)",
                textShadow: "0 0 10px oklch(0.70 0.20 190 / 0.5)",
              }}
            >
              GAME HISTORY
            </h1>
            <p className="text-xs text-muted-foreground">
              Your complete play history
            </p>
          </div>
        </div>

        <div
          className="rounded-xl overflow-hidden"
          style={{
            background: "oklch(0.11 0.015 280)",
            border: "1px solid oklch(0.22 0.03 275)",
          }}
        >
          {isLoading ? (
            <div
              className="flex justify-center py-16"
              data-ocid="history.loading_state"
            >
              <Loader2
                className="w-8 h-8 animate-spin"
                style={{ color: "oklch(0.65 0.28 340)" }}
              />
            </div>
          ) : sorted.length === 0 ? (
            <div className="py-16 text-center" data-ocid="history.empty_state">
              <p className="text-4xl mb-4">🎮</p>
              <p className="text-muted-foreground">
                No games played yet. Hit the lobby!
              </p>
            </div>
          ) : (
            <Table data-ocid="history.table">
              <TableHeader>
                <TableRow
                  style={{
                    borderBottomColor: "oklch(0.65 0.28 340 / 0.2)",
                    background: "oklch(0.13 0.018 280)",
                  }}
                >
                  <TableHead className="text-muted-foreground font-black tracking-wider">
                    Game
                  </TableHead>
                  <TableHead className="text-muted-foreground font-black tracking-wider">
                    Bet
                  </TableHead>
                  <TableHead className="text-muted-foreground font-black tracking-wider">
                    Result
                  </TableHead>
                  <TableHead className="text-muted-foreground font-black tracking-wider text-right">
                    Change
                  </TableHead>
                  <TableHead className="text-muted-foreground font-black tracking-wider">
                    Date
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((game, i) => (
                  <TableRow
                    key={game.timestamp.toString()}
                    style={{ borderBottomColor: "oklch(0.22 0.03 275)" }}
                    data-ocid={`history.item.${i + 1}`}
                  >
                    <TableCell className="font-bold capitalize text-foreground">
                      {game.gameType}
                    </TableCell>
                    <TableCell className="text-foreground">
                      {game.bet.toString()}
                    </TableCell>
                    <TableCell>
                      <Badge
                        style={
                          game.result === GameResult.win
                            ? {
                                background: "oklch(0.65 0.28 340 / 0.15)",
                                color: "oklch(0.65 0.28 340)",
                                border: "1px solid oklch(0.65 0.28 340 / 0.4)",
                                boxShadow: "0 0 6px oklch(0.65 0.28 340 / 0.3)",
                              }
                            : {
                                background: "oklch(0.577 0.245 27 / 0.15)",
                                color: "oklch(0.70 0.22 25)",
                                border: "1px solid oklch(0.577 0.245 27 / 0.4)",
                              }
                        }
                      >
                        {game.result === GameResult.win ? "WIN" : "LOSE"}
                      </Badge>
                    </TableCell>
                    <TableCell
                      className="text-right font-black"
                      style={{
                        color:
                          game.result === GameResult.win
                            ? "oklch(0.65 0.28 340)"
                            : "oklch(0.577 0.245 27)",
                        textShadow:
                          game.result === GameResult.win
                            ? "0 0 6px oklch(0.65 0.28 340 / 0.5)"
                            : "none",
                      }}
                    >
                      {game.result === GameResult.win ? "+" : "-"}
                      {game.balanceChange.toString()}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {formatDate(game.timestamp)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </motion.div>
    </div>
  );
}
