import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export type Time = bigint;
export interface UserGame {
    bet: bigint;
    result: GameResult;
    user: Principal;
    timestamp: Time;
    gameType: GameType;
    balanceChange: bigint;
}
export interface DailyWinner {
    user: Principal;
    amount: bigint;
}
export interface UserProfile {
    name: string;
}
export enum GameResult {
    win = "win",
    lose = "lose"
}
export enum GameType {
    war = "war",
    mines = "mines",
    penaltyShootout = "penaltyShootout",
    blackjack = "blackjack",
    ballDrop = "ballDrop",
    plinko = "plinko",
    dice = "dice",
    threeCardPoker = "threeCardPoker",
    hiLo = "hiLo",
    keno = "keno",
    craps = "craps",
    wheelOfFortune = "wheelOfFortune",
    scratchCards = "scratchCards",
    limbo = "limbo",
    sicBo = "sicBo",
    baccarat = "baccarat",
    slots = "slots",
    caribbeanStud = "caribbeanStud",
    paiGowPoker = "paiGowPoker",
    letItRide = "letItRide",
    videoPoker = "videoPoker",
    roulette = "roulette",
    casinoHoldem = "casinoHoldem",
    coinPusher = "coinPusher",
    crashGame = "crashGame"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    addCredits(user: Principal, amount: bigint): Promise<void>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    claimDailyCredits(): Promise<void>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getDailyWinners(): Promise<Array<DailyWinner>>;
    getGameHistory(user: Principal): Promise<Array<UserGame>>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    getWalletBalance(): Promise<bigint>;
    initializeBalance(): Promise<void>;
    isCallerAdmin(): Promise<boolean>;
    playGame(gameType: GameType, bet: bigint): Promise<UserGame>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
}
