import Map "mo:core/Map";
import List "mo:core/List";
import Time "mo:core/Time";
import Array "mo:core/Array";
import Int "mo:core/Int";
import Principal "mo:core/Principal";
import AccessControl "authorization/access-control";

module {
  type OldGameResult = { #win; #lose };
  type OldGameType = { #slots; #blackjack; #roulette; #videoPoker; #dice; #baccarat };
  type OldDailyWinner = {
    user : Principal;
    amount : Int;
  };

  type OldUserGame = {
    user : Principal;
    gameType : OldGameType;
    bet : Nat;
    result : OldGameResult;
    timestamp : Time.Time;
    balanceChange : Int;
  };

  type OldActor = {
    dailyWinners : List.List<OldDailyWinner>;
    gameHistory : Map.Map<Principal, List.List<OldUserGame>>;
    userBalances : Map.Map<Principal, Int>;
    lastClaimDay : Map.Map<Principal, Time.Time>;
    gameResultArray : [OldGameResult];
    casinoWallet : Int;
    accessControlState : AccessControl.AccessControlState;
    userProfiles : Map.Map<Principal, { name : Text }>;
  };

  type NewGameResult = { #win; #lose };
  type NewGameType = { #slots; #blackjack; #roulette; #videoPoker; #dice; #baccarat; #keno; #scratchCards; #craps; #paiGowPoker; #sicBo; #war; #caribbeanStud; #letItRide; #threeCardPoker; #casinoHoldem; #wheelOfFortune; #coinPusher; #plinko; #crashGame; #mines; #limbo; #hiLo; #penaltyShootout; #ballDrop };
  type NewDailyWinner = {
    user : Principal;
    amount : Int;
  };

  type NewUserGame = {
    user : Principal;
    gameType : NewGameType;
    bet : Nat;
    result : NewGameResult;
    timestamp : Time.Time;
    balanceChange : Int;
  };

  type NewActor = {
    dailyWinners : List.List<NewDailyWinner>;
    gameHistory : Map.Map<Principal, List.List<NewUserGame>>;
    userBalances : Map.Map<Principal, Int>;
    lastClaimDay : Map.Map<Principal, Time.Time>;
    gameResultArray : [NewGameResult];
    casinoWallet : Int;
    accessControlState : AccessControl.AccessControlState;
    userProfiles : Map.Map<Principal, { name : Text }>;
  };

  func convertGameType(oldGameType : OldGameType) : NewGameType {
    switch (oldGameType) {
      case (#slots) { #slots };
      case (#blackjack) { #blackjack };
      case (#roulette) { #roulette };
      case (#videoPoker) { #videoPoker };
      case (#dice) { #dice };
      case (#baccarat) { #baccarat };
    };
  };

  func convertGameResult(oldGameResult : OldGameResult) : NewGameResult {
    switch (oldGameResult) {
      case (#win) { #win };
      case (#lose) { #lose };
    };
  };

  func convertOldGame(oldGame : OldUserGame) : NewUserGame {
    {
      oldGame with
      result = convertGameResult(oldGame.result);
      gameType = convertGameType(oldGame.gameType);
    };
  };

  func convertGameHistory(oldGameHistory : Map.Map<Principal, List.List<OldUserGame>>) : Map.Map<Principal, List.List<NewUserGame>> {
    oldGameHistory.map<Principal, List.List<OldUserGame>, List.List<NewUserGame>>(
      func(_principal, oldList) {
        let newList = oldList.map<OldUserGame, NewUserGame>(convertOldGame);
        newList;
      }
    );
  };

  public func run(old : OldActor) : NewActor {
    {
      old with
      gameHistory = convertGameHistory(old.gameHistory);
      gameResultArray = [#win, #lose];
    };
  };
};
