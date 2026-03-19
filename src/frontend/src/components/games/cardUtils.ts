export type Suit = "♠" | "♥" | "♦" | "♣";
export type Rank =
  | "A"
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "9"
  | "10"
  | "J"
  | "Q"
  | "K";

export interface Card {
  suit: Suit;
  rank: Rank;
  faceDown?: boolean;
}

export function createDeck(numDecks = 1): Card[] {
  const suits: Suit[] = ["♠", "♥", "♦", "♣"];
  const ranks: Rank[] = [
    "A",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "10",
    "J",
    "Q",
    "K",
  ];
  const deck: Card[] = [];
  for (let d = 0; d < numDecks; d++) {
    for (const suit of suits) {
      for (const rank of ranks) {
        deck.push({ suit, rank });
      }
    }
  }
  return shuffleDeck(deck);
}

export function shuffleDeck(deck: Card[]): Card[] {
  const d = [...deck];
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

export function rankNumericValue(rank: Rank): number {
  if (rank === "A") return 14;
  if (rank === "K") return 13;
  if (rank === "Q") return 12;
  if (rank === "J") return 11;
  return Number.parseInt(rank, 10);
}

export function cardValue(rank: Rank): number {
  if (rank === "A") return 11;
  if (["J", "Q", "K"].includes(rank)) return 10;
  return Number.parseInt(rank, 10);
}

export function handValue(cards: Card[]): number {
  let value = 0;
  let aces = 0;
  for (const card of cards) {
    if (card.faceDown) continue;
    value += cardValue(card.rank);
    if (card.rank === "A") aces++;
  }
  while (value > 21 && aces > 0) {
    value -= 10;
    aces--;
  }
  return value;
}

export function isRedSuit(suit: Suit): boolean {
  return suit === "♥" || suit === "♦";
}

export function isBlackjack(cards: Card[]): boolean {
  const visible = cards.filter((c) => !c.faceDown);
  if (visible.length !== 2) return false;
  const vals = visible.map((c) => cardValue(c.rank));
  return (
    (vals[0] === 11 && vals[1] === 10) || (vals[0] === 10 && vals[1] === 11)
  );
}

// Video Poker hand evaluation
export type PokerHand =
  | "Royal Flush"
  | "Straight Flush"
  | "Four of a Kind"
  | "Full House"
  | "Flush"
  | "Straight"
  | "Three of a Kind"
  | "Two Pair"
  | "Jacks or Better"
  | "Nothing";

export function evaluatePokerHand(cards: Card[]): PokerHand {
  const ranks = cards.map((c) => rankNumericValue(c.rank));
  const suits = cards.map((c) => c.suit);
  const rankCounts: Record<number, number> = {};
  for (const r of ranks) rankCounts[r] = (rankCounts[r] ?? 0) + 1;
  const counts = Object.values(rankCounts).sort((a, b) => b - a);
  const isFlush = suits.every((s) => s === suits[0]);
  const sortedRanks = [...ranks].sort((a, b) => a - b);
  const isConsecutive =
    sortedRanks[4] - sortedRanks[0] === 4 && new Set(sortedRanks).size === 5;
  // Special case: A-2-3-4-5 straight (wheel)
  const isWheel =
    JSON.stringify(sortedRanks) === JSON.stringify([2, 3, 4, 5, 14]);
  const isStraight = isConsecutive || isWheel;

  if (isFlush && !isWheel && sortedRanks.join(",") === "10,11,12,13,14")
    return "Royal Flush";
  if (isFlush && isStraight) return "Straight Flush";
  if (counts[0] === 4) return "Four of a Kind";
  if (counts[0] === 3 && counts[1] === 2) return "Full House";
  if (isFlush) return "Flush";
  if (isStraight) return "Straight";
  if (counts[0] === 3) return "Three of a Kind";
  if (counts[0] === 2 && counts[1] === 2) return "Two Pair";
  if (counts[0] === 2) {
    // Pair: check if it's Jacks or better
    const pairRank = Number(
      Object.entries(rankCounts).find(([, v]) => v === 2)?.[0],
    );
    if (pairRank >= 11) return "Jacks or Better";
  }
  return "Nothing";
}

export const POKER_PAYOUTS: Record<PokerHand, number> = {
  "Royal Flush": 250,
  "Straight Flush": 50,
  "Four of a Kind": 25,
  "Full House": 9,
  Flush: 6,
  Straight: 4,
  "Three of a Kind": 3,
  "Two Pair": 2,
  "Jacks or Better": 1,
  Nothing: 0,
};
