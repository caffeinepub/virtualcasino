import Map "mo:core/Map";
import List "mo:core/List";
import Time "mo:core/Time";
import Nat "mo:core/Nat";
import Int "mo:core/Int";
import Float "mo:core/Float";
import Principal "mo:core/Principal";

module {
  type GameType = { #slots; #blackjack; #roulette; #videoPoker; #dice; #baccarat; #keno; #scratchCards; #craps; #paiGowPoker; #sicBo; #war; #caribbeanStud; #letItRide; #threeCardPoker; #casinoHoldem; #wheelOfFortune; #coinPusher; #plinko; #crashGame; #mines; #limbo; #hiLo; #penaltyShootout; #ballDrop };
  type GameResult = { #win; #lose };
  type DailyWinner = {
    user : Principal;
    amount : Int;
  };

  type UserProfile = {
    name : Text;
  };

  type GameSettings = {
    minBet : Nat;
    maxBet : Nat;
    winMultiplier : Float;
  };

  type UserSummary = {
    principal : Principal;
    name : Text;
    balance : Int;
    points : Int;
    role : Text;
    joinDate : Time.Time;
    totalGamesPlayed : Nat;
    totalCreditsWon : Int;
  };

  type Product = {
    id : Text;
    name : Text;
    description : Text;
    category : Text;
    pointPrice : Nat;
    available : Bool;
  };

  type RedemptionRequest = {
    id : Text;
    user : Principal;
    userName : Text;
    productId : Text;
    productName : Text;
    pointPrice : Nat;
    timestamp : Time.Time;
    status : Text;
  };

  type CurrentActor = {
    userBalances : Map.Map<Principal, Int>;
    gameHistory : Map.Map<Principal, List.List<UserGame>>;
    dailyWinners : List.List<DailyWinner>;
    lastClaimDay : Map.Map<Principal, Time.Time>;
    userProfiles : Map.Map<Principal, UserProfile>;
    userJoinDates : Map.Map<Principal, Time.Time>;
    userTotalGamesPlayed : Map.Map<Principal, Nat>;
    userTotalCreditsWon : Map.Map<Principal, Int>;
    gameSettingsMap : Map.Map<Text, GameSettings>;
  };

  type UserGame = {
    user : Principal;
    gameType : GameType;
    bet : Nat;
    result : GameResult;
    timestamp : Time.Time;
    balanceChange : Int;
  };

  type NewActor = {
    userBalances : Map.Map<Principal, Int>;
    userPoints : Map.Map<Principal, Int>;
    gameHistory : Map.Map<Principal, List.List<UserGame>>;
    dailyWinners : List.List<DailyWinner>;
    lastClaimDay : Map.Map<Principal, Time.Time>;
    userProfiles : Map.Map<Principal, UserProfile>;
    userJoinDates : Map.Map<Principal, Time.Time>;
    userTotalGamesPlayed : Map.Map<Principal, Nat>;
    userTotalCreditsWon : Map.Map<Principal, Int>;
    gameSettingsMap : Map.Map<Text, GameSettings>;
    productsMap : Map.Map<Text, Product>;
    nextProductId : Nat;
    redemptionsMap : Map.Map<Text, RedemptionRequest>;
    nextRedemptionId : Nat;
  };

  func emptyMap<K, V>() : Map.Map<K, V> {
    Map.empty<K, V>();
  };

  public func run(current : CurrentActor) : NewActor {
    {
      current with
      userPoints = current.userBalances.map<Principal, Int, Int>(func(_k, _v) { 0 });
      productsMap = emptyMap<Text, Product>();
      nextProductId = 1;
      redemptionsMap = emptyMap<Text, RedemptionRequest>();
      nextRedemptionId = 1;
    };
  };
};
