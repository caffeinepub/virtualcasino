import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface DailyWinner {
    user: Principal;
    amount: bigint;
}
export interface GameSettings {
    minBet: bigint;
    winMultiplier: number;
    maxBet: bigint;
}
export type Time = bigint;
export interface UserGame {
    bet: bigint;
    result: GameResult;
    user: Principal;
    timestamp: Time;
    gameType: GameType;
    balanceChange: bigint;
}
export interface RedemptionRequest {
    id: string;
    status: string;
    userName: string;
    user: Principal;
    productId: string;
    productName: string;
    timestamp: Time;
    pointPrice: bigint;
}
export interface UserSummary {
    principal: Principal;
    balance: bigint;
    joinDate: Time;
    name: string;
    role: string;
    totalGamesPlayed: bigint;
    totalCreditsWon: bigint;
    points: bigint;
}
export interface Product {
    id: string;
    name: string;
    description: string;
    available: boolean;
    pointPrice: bigint;
    category: string;
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
    addProduct(name: string, description: string, category: string, pointPrice: bigint): Promise<Product>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    claimDailyCredits(): Promise<void>;
    getAllGameSettings(): Promise<Array<[string, GameSettings]>>;
    getAllProducts(): Promise<Array<Product>>;
    getAllProductsAdmin(): Promise<Array<Product>>;
    getAllRedemptions(): Promise<Array<RedemptionRequest>>;
    getAllUsers(): Promise<Array<UserSummary>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getDailyWinners(): Promise<Array<DailyWinner>>;
    getGameHistory(user: Principal): Promise<Array<UserGame>>;
    getGameSettings(gameType: GameType): Promise<GameSettings | null>;
    getMyRedemptions(): Promise<Array<RedemptionRequest>>;
    getPointsBalance(): Promise<bigint>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    getWalletBalance(): Promise<bigint>;
    initializeBalance(): Promise<void>;
    isCallerAdmin(): Promise<boolean>;
    playGame(gameType: GameType, bet: bigint): Promise<UserGame>;
    redeemProduct(productId: string): Promise<RedemptionRequest>;
    removeProduct(id: string): Promise<void>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    setGameSettings(gameType: GameType, settings: GameSettings): Promise<void>;
    updateProduct(id: string, name: string, description: string, category: string, pointPrice: bigint, available: boolean): Promise<Product>;
    updateRedemptionStatus(id: string, status: string): Promise<void>;
}
