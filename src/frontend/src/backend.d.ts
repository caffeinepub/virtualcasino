import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface GameChallenge {
    id: string;
    to: Principal;
    bet: bigint;
    status: string;
    from: Principal;
    timestamp: Time;
    gameType: GameType;
}
export interface GameSettings {
    minBet: bigint;
    winMultiplier: number;
    maxBet: bigint;
}
export type Time = bigint;
export interface FriendInfo {
    principal: Principal;
    username: string;
}
export interface DailyWinner {
    user: Principal;
    amount: bigint;
}
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
    username: string;
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
    username: string;
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
    spaceShooter = "spaceShooter",
    ballDrop = "ballDrop",
    plinko = "plinko",
    whackAMole = "whackAMole",
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
    snake = "snake",
    caribbeanStud = "caribbeanStud",
    paiGowPoker = "paiGowPoker",
    letItRide = "letItRide",
    videoPoker = "videoPoker",
    roulette = "roulette",
    casinoHoldem = "casinoHoldem",
    coinPusher = "coinPusher",
    crashGame = "crashGame",
    breakout = "breakout",
    pacmanStyle = "pacmanStyle",
    tetris = "tetris",
    galaga = "galaga",
    frogger = "frogger",
    streetFighter = "streetFighter",
    donkeyKong = "donkeyKong",
    asteroids = "asteroids",
    centipede = "centipede",
    digDug = "digDug",
    skeeBall = "skeeBall",
    pinball = "pinball",
    danceDanceRevolution = "danceDanceRevolution",
    timeCrisis = "timeCrisis",
    duckHunt = "duckHunt",
    airHockey = "airHockey",
    qbert = "qbert",
    tron = "tron",
    burgerTime = "burgerTime",
    metalSlug = "metalSlug",
    bomberman = "bomberman",
    trackAndField = "trackAndField",
    daytonaUSA = "daytonaUSA",
    mortalKombat = "mortalKombat",
    puzzleBobble = "puzzleBobble",
    houseOfTheDead = "houseOfTheDead",
    kungFuMaster = "kungFuMaster"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    addCredits(user: Principal, amount: bigint): Promise<void>;
    addCreditsByUsername(username: string, amount: bigint): Promise<void>;
    addProduct(name: string, description: string, category: string, pointPrice: bigint): Promise<Product>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    canClaimDailyCredits(): Promise<boolean>;
    cancelGameChallenge(challengeId: string): Promise<GameChallenge>;
    claimDailyCredits(): Promise<void>;
    getAllGameSettings(): Promise<Array<[string, GameSettings]>>;
    getAllProducts(): Promise<Array<Product>>;
    getAllProductsAdmin(): Promise<Array<Product>>;
    getAllRedemptions(): Promise<Array<RedemptionRequest>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getDailyWinners(): Promise<Array<DailyWinner>>;
    getFriendRequests(): Promise<Array<{
        from: Principal;
        timestamp: Time;
        fromUsername: string;
    }>>;
    getFriends(): Promise<Array<FriendInfo>>;
    getGameHistory(user: Principal): Promise<Array<UserGame>>;
    getGameSettings(gameType: GameType): Promise<GameSettings | null>;
    getMyRedemptions(): Promise<Array<RedemptionRequest>>;
    getPendingChallenges(): Promise<Array<GameChallenge>>;
    getPointsBalance(): Promise<bigint>;
    getSentChallenges(): Promise<Array<GameChallenge>>;
    getUserByUsername(username: string): Promise<Principal | null>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    getUsernameByPrincipal(user: Principal): Promise<string | null>;
    getWalletBalance(): Promise<bigint>;
    initializeBalance(): Promise<void>;
    isCallerAdmin(): Promise<boolean>;
    playGame(gameType: GameType, bet: bigint): Promise<UserGame>;
    recordGameOutcome(gameType: GameType, bet: bigint, won: boolean, winAmount: bigint): Promise<UserGame>;
    redeemProduct(productId: string): Promise<RedemptionRequest>;
    removeFriend(friendPrincipal: Principal): Promise<void>;
    removeProduct(id: string): Promise<void>;
    respondFriendRequest(fromPrincipal: Principal, accept: boolean): Promise<void>;
    respondGameChallenge(challengeId: string, accept: boolean): Promise<GameChallenge>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    sendFriendRequest(toUsername: string): Promise<void>;
    sendGameChallenge(toUsername: string, gameType: GameType, bet: bigint): Promise<GameChallenge>;
    setGameSettings(gameType: GameType, settings: GameSettings): Promise<void>;
    setUsername(username: string): Promise<void>;
    updateProduct(id: string, name: string, description: string, category: string, pointPrice: bigint, available: boolean): Promise<Product>;
    updateRedemptionStatus(id: string, status: string): Promise<void>;
}
