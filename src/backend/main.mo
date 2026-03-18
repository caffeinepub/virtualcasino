import Array "mo:core/Array";
import List "mo:core/List";
import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Int "mo:core/Int";
import Text "mo:core/Text";
import Time "mo:core/Time";
import Order "mo:core/Order";
import Runtime "mo:core/Runtime";
import Principal "mo:core/Principal";
import Migration "migration";
import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";

(with migration = Migration.run)
actor {
  type GameType = { #slots; #blackjack; #roulette; #videoPoker; #dice; #baccarat; #keno; #scratchCards; #craps; #paiGowPoker; #sicBo; #war; #caribbeanStud; #letItRide; #threeCardPoker; #casinoHoldem; #wheelOfFortune; #coinPusher; #plinko; #crashGame; #mines; #limbo; #hiLo; #penaltyShootout; #ballDrop };
  type GameResult = { #win; #lose };
  type DailyWinner = {
    user : Principal;
    amount : Int;
  };

  public type UserProfile = {
    name : Text;
  };

  func compareByWalletBalance(winner1 : DailyWinner, winner2 : DailyWinner) : Order.Order {
    Int.compare(winner2.amount, winner1.amount);
  };

  func compareByRandom(_winner1 : DailyWinner, _winner2 : DailyWinner) : Order.Order {
    Nat.compare(Int.abs(Time.now()) % 2, 0);
  };

  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  var casinoWallet : Int = 0;

  let gameResultArray = [#win, #lose];

  func getRandomGameResult() : GameResult {
    let randomNumber = Time.now();
    gameResultArray[Int.abs(randomNumber).toNat() % 2];
  };

  func getRandomBalanceChange(bet : Nat, result : GameResult) : Int {
    switch (result) {
      case (#win) { bet.toInt() };
      case (#lose) { -bet.toInt() };
    };
  };

  type UserGame = {
    user : Principal;
    gameType : GameType;
    bet : Nat;
    result : GameResult;
    timestamp : Time.Time;
    balanceChange : Int;
  };

  let userBalances = Map.empty<Principal, Int>();
  let gameHistory = Map.empty<Principal, List.List<UserGame>>();
  let dailyWinners = List.empty<DailyWinner>();
  var lastClaimDay = Map.empty<Principal, Time.Time>();
  let userProfiles = Map.empty<Principal, UserProfile>();

  public shared ({ caller }) func initializeBalance() : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can initialize balance");
    };

    switch (userBalances.get(caller)) {
      case (?_isRegistered) { return };
      case (null) {};
    };
    userBalances.add(caller, 10);
  };

  public query ({ caller }) func getWalletBalance() : async Int {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view wallet balance");
    };
    switch (userBalances.get(caller)) {
      case (?balance) { balance };
      case (null) { Runtime.trap("User not found") };
    };
  };

  public shared ({ caller }) func addCredits(user : Principal, amount : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can add credits");
    };
    var currentBalance = switch (userBalances.get(user)) {
      case (?balance) { balance };
      case (null) { 0 };
    };
    currentBalance += amount;
    userBalances.add(user, currentBalance);
  };

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view profiles");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.add(caller, profile);
  };

  public shared ({ caller }) func claimDailyCredits() : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can claim credits");
    };

    let currentDay = Time.now() / 86_400_000_000_000; // Convert to days
    switch (lastClaimDay.get(caller)) {
      case (?lastDay) {
        if ((Time.now() / 86_400_000_000_000) == lastDay) {
          Runtime.trap("You can only claim once per day");
        };
      };
      case (_) {};
    };
    var currentBalance = switch (userBalances.get(caller)) {
      case (?balance) { balance };
      case (null) { 0 };
    };
    currentBalance += 5;
    userBalances.add(caller, currentBalance);
    lastClaimDay.add(caller, currentDay);
  };

  public shared ({ caller }) func playGame(gameType : GameType, bet : Nat) : async UserGame {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can play games");
    };

    // Check balance
    var currentBalance = switch (userBalances.get(caller)) {
      case (?balance) { balance };
      case (null) { 0 };
    };
    if (bet > Int.abs(currentBalance)) {
      Runtime.trap("Not enough credits to place bet");
    };

    // Update balance (subtract bet)
    currentBalance -= bet;
    userBalances.add(caller, currentBalance);

    // Calculate outcome (win/loss) and balance change
    let result = getRandomGameResult();
    let balanceChange = getRandomBalanceChange(bet, result);
    currentBalance += balanceChange;
    userBalances.add(caller, currentBalance);

    // Update casino balance
    casinoWallet -= balanceChange;

    // Record game result
    let newGame : UserGame = {
      user = caller;
      gameType;
      bet;
      result;
      timestamp = Time.now();
      balanceChange;
    };

    let userGameList = switch (gameHistory.get(caller)) {
      case (?existingList) { existingList };
      case (null) { List.empty<UserGame>() };
    };
    userGameList.add(newGame);
    gameHistory.add(caller, userGameList);

    // Track daily winner if won
    if (result == #win and balanceChange > 0) {
      dailyWinners.add({ user = caller; amount = balanceChange });
    };

    newGame;
  };

  public query ({ caller }) func getGameHistory(user : Principal) : async [UserGame] {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own game history");
    };
    switch (gameHistory.get(user)) {
      case (?history) { history.toArray() };
      case (null) { [] };
    };
  };

  public query ({ caller }) func getDailyWinners() : async [DailyWinner] {
    let sortedList = dailyWinners.toArray().sort(compareByWalletBalance);

    // Shuffle (randomize) the entries
    let shuffled = sortedList.sort(compareByRandom);

    // Take top 10
    shuffled.sliceToArray(0, Int.abs(Nat.min(10, shuffled.size())));
  };
};

