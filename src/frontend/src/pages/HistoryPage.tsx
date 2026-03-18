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
        <div className="flex items-center gap-2 mb-6">
          <History className="w-6 h-6 text-gold" />
          <h1 className="font-display text-2xl font-bold tracking-wider">
            GAME HISTORY
          </h1>
        </div>

        <div className="card-dark rounded-xl overflow-hidden">
          {isLoading ? (
            <div
              className="flex justify-center py-16"
              data-ocid="history.loading_state"
            >
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
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
                  style={{ borderBottomColor: "oklch(0.22 0.025 225)" }}
                >
                  <TableHead className="text-muted-foreground">Game</TableHead>
                  <TableHead className="text-muted-foreground">Bet</TableHead>
                  <TableHead className="text-muted-foreground">
                    Result
                  </TableHead>
                  <TableHead className="text-muted-foreground text-right">
                    Balance Change
                  </TableHead>
                  <TableHead className="text-muted-foreground">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((game, i) => (
                  <TableRow
                    key={game.timestamp.toString()}
                    style={{ borderBottomColor: "oklch(0.22 0.025 225)" }}
                    data-ocid={`history.item.${i + 1}`}
                  >
                    <TableCell className="font-medium capitalize">
                      {game.gameType}
                    </TableCell>
                    <TableCell>{game.bet.toString()}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          game.result === GameResult.win
                            ? "default"
                            : "destructive"
                        }
                        style={
                          game.result === GameResult.win
                            ? {
                                background: "oklch(0.70 0.13 72 / 0.2)",
                                color: "oklch(0.82 0.12 75)",
                                border: "1px solid oklch(0.70 0.13 72 / 0.4)",
                              }
                            : {}
                        }
                      >
                        {game.result === GameResult.win ? "WIN" : "LOSE"}
                      </Badge>
                    </TableCell>
                    <TableCell
                      className={`text-right font-bold ${
                        game.result === GameResult.win
                          ? "text-gold"
                          : "text-destructive"
                      }`}
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
