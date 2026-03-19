import Array "mo:core/Array";
import List "mo:core/List";
import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Int "mo:core/Int";
import Float "mo:core/Float";
import Text "mo:core/Text";
import Char "mo:core/Char";
import Time "mo:core/Time";
import Order "mo:core/Order";
import Runtime "mo:core/Runtime";
import Principal "mo:core/Principal";
import Iter "mo:core/Iter";
import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";


// Apply migration using with clause


actor {
  type GameType = {
    #slots;
    #blackjack;
    #roulette;
    #videoPoker;
    #dice;
    #baccarat;
    #keno;
    #scratchCards;
    #craps;
    #paiGowPoker;
    #sicBo;
    #war;
    #caribbeanStud;
    #letItRide;
    #threeCardPoker;
    #casinoHoldem;
    #wheelOfFortune;
    #coinPusher;
    #plinko;
    #crashGame;
    #mines;
    #limbo;
    #hiLo;
    #penaltyShootout;
    #ballDrop;
    #snake; // Arcade Games
    #spaceShooter;
    #breakout;
    #pacmanStyle;
    #whackAMole;
  };

  type GameResult = { #win; #lose };
  type DailyWinner = {
    user : Principal;
    amount : Int;
  };

  public type UserProfile = {
    name : Text;
    username : Text;
  };

  public type GameSettings = {
    minBet : Nat;
    maxBet : Nat;
    winMultiplier : Float;
  };

  public type UserSummary = {
    principal : Principal;
    name : Text;
    balance : Int;
    points : Int;
    role : Text;
    joinDate : Time.Time;
    totalGamesPlayed : Nat;
    totalCreditsWon : Int;
    username : Text;
  };

  public type Product = {
    id : Text;
    name : Text;
    description : Text;
    category : Text;
    pointPrice : Nat;
    available : Bool;
  };

  public type RedemptionRequest = {
    id : Text;
    user : Principal;
    userName : Text;
    productId : Text;
    productName : Text;
    pointPrice : Nat;
    timestamp : Time.Time;
    status : Text;
  };

  public type FriendRequest = {
    from : Principal;
    to : Principal;
    timestamp : Time.Time;
  };

  public type FriendInfo = {
    principal : Principal;
    username : Text;
  };

  public type GameChallenge = {
    id : Text;
    from : Principal;
    to : Principal;
    gameType : GameType;
    bet : Nat;
    timestamp : Time.Time;
    status : Text;
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

  type UserGame = {
    user : Principal;
    gameType : GameType;
    bet : Nat;
    result : GameResult;
    timestamp : Time.Time;
    balanceChange : Int;
  };

  let userBalances = Map.empty<Principal, Int>();
  let userPoints = Map.empty<Principal, Int>();
  let gameHistory = Map.empty<Principal, List.List<UserGame>>();
  let dailyWinners = List.empty<DailyWinner>();
  var lastClaimDay = Map.empty<Principal, Time.Time>();
  let userProfiles = Map.empty<Principal, UserProfile>();
  let userJoinDates = Map.empty<Principal, Time.Time>();
  let userTotalGamesPlayed = Map.empty<Principal, Nat>();
  let userTotalCreditsWon = Map.empty<Principal, Int>();
  let gameSettingsMap = Map.empty<Text, GameSettings>();

  let productsMap = Map.empty<Text, Product>();
  var nextProductId = 1;
  let redemptionsMap = Map.empty<Text, RedemptionRequest>();
  var nextRedemptionId = 1;

  let usernameToOwner = Map.empty<Text, Principal>();
  let ownerToUsername = Map.empty<Principal, Text>();

  let pendingRequestsMap = Map.empty<Principal, List.List<FriendRequest>>();
  let friendsListMap = Map.empty<Principal, List.List<Principal>>();

  let challengesMap = Map.empty<Text, GameChallenge>();
  var nextChallengeId = 1;

  func gameTypeToText(g : GameType) : Text {
    switch (g) {
      case (#slots) { "slots" };
      case (#blackjack) { "blackjack" };
      case (#roulette) { "roulette" };
      case (#videoPoker) { "videoPoker" };
      case (#dice) { "dice" };
      case (#baccarat) { "baccarat" };
      case (#keno) { "keno" };
      case (#scratchCards) { "scratchCards" };
      case (#craps) { "craps" };
      case (#paiGowPoker) { "paiGowPoker" };
      case (#sicBo) { "sicBo" };
      case (#war) { "war" };
      case (#caribbeanStud) { "caribbeanStud" };
      case (#letItRide) { "letItRide" };
      case (#threeCardPoker) { "threeCardPoker" };
      case (#casinoHoldem) { "casinoHoldem" };
      case (#wheelOfFortune) { "wheelOfFortune" };
      case (#coinPusher) { "coinPusher" };
      case (#plinko) { "plinko" };
      case (#crashGame) { "crashGame" };
      case (#mines) { "mines" };
      case (#limbo) { "limbo" };
      case (#hiLo) { "hiLo" };
      case (#penaltyShootout) { "penaltyShootout" };
      case (#ballDrop) { "ballDrop" };
      case (#snake) { "snake" };
      case (#spaceShooter) { "spaceShooter" };
      case (#breakout) { "breakout" };
      case (#pacmanStyle) { "pacmanStyle" };
      case (#whackAMole) { "whackAMole" };
    };
  };

  public shared ({ caller }) func initializeBalance() : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can initialize balance");
    };

    switch (userBalances.get(caller)) {
      case (?_isRegistered) { return };
      case (null) {};
    };
    userBalances.add(caller, 10);
    userPoints.add(caller, 0);
    userJoinDates.add(caller, Time.now());
    userTotalGamesPlayed.add(caller, 0);
    userTotalCreditsWon.add(caller, 0);
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

  public query ({ caller }) func getPointsBalance() : async Int {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view points balance");
    };
    switch (userPoints.get(caller)) {
      case (?points) { points };
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

    let currentDay = Time.now() / 86_400_000_000_000;
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

  public query ({ caller }) func canClaimDailyCredits() : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      return false;
    };
    let currentDay = Time.now() / 86_400_000_000_000;
    switch (lastClaimDay.get(caller)) {
      case (?lastDay) {
        if (lastDay == currentDay) { return false };
      };
      case (_) {};
    };
    return true;
  };

  public shared ({ caller }) func setGameSettings(gameType : GameType, settings : GameSettings) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can set game settings");
    };
    gameSettingsMap.add(gameTypeToText(gameType), settings);
  };

  public query func getGameSettings(gameType : GameType) : async ?GameSettings {
    gameSettingsMap.get(gameTypeToText(gameType));
  };

  public query func getAllGameSettings() : async [(Text, GameSettings)] {
    gameSettingsMap.toArray();
  };

  public query ({ caller }) func getAllUsers() : async [UserSummary] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can view all users");
    };
    let entries = userBalances.toArray();
    entries.map(
      func((p, bal) : (Principal, Int)) : UserSummary {
        let name = switch (userProfiles.get(p)) {
          case (?profile) { profile.name };
          case (null) { "" };
        };
        let joinDate = switch (userJoinDates.get(p)) {
          case (?d) { d };
          case (null) { 0 };
        };
        let totalGamesPlayed = switch (userTotalGamesPlayed.get(p)) {
          case (?n) { n };
          case (null) { 0 };
        };
        let totalCreditsWon = switch (userTotalCreditsWon.get(p)) {
          case (?n) { n };
          case (null) { 0 };
        };
        let points = switch (userPoints.get(p)) {
          case (?pt) { pt };
          case (null) { 0 };
        };
        let role = if (AccessControl.isAdmin(accessControlState, p)) { "admin" } else { "user" };
        let username = switch (ownerToUsername.get(p)) {
          case (?u) { u };
          case (null) { "" };
        };
        {
          principal = p;
          name;
          balance = bal;
          points;
          role;
          joinDate;
          totalGamesPlayed;
          totalCreditsWon;
          username;
        };
      },
    );
  };

  public shared ({ caller }) func playGame(gameType : GameType, bet : Nat) : async UserGame {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can play games");
    };

    var currentBalance = switch (userBalances.get(caller)) {
      case (?balance) { balance };
      case (null) { 0 };
    };
    if (bet > Int.abs(currentBalance)) {
      Runtime.trap("Not enough credits to place bet");
    };

    // Check game settings for min/max bet
    switch (gameSettingsMap.get(gameTypeToText(gameType))) {
      case (?settings) {
        if (bet < settings.minBet) {
          Runtime.trap("Bet is below minimum allowed");
        };
        if (bet > settings.maxBet) {
          Runtime.trap("Bet exceeds maximum allowed");
        };
      };
      case (null) {};
    };

    currentBalance -= bet;
    userBalances.add(caller, currentBalance);

    let result = getRandomGameResult();
    var balanceChange : Int = 0;
    switch (result) {
      case (#win) {
        let multiplier = switch (gameSettingsMap.get(gameTypeToText(gameType))) {
          case (?settings) { settings.winMultiplier };
          case (null) { 1.0 };
        };
        let winAmount = (bet.toFloat() * multiplier).toInt();
        balanceChange := winAmount;
      };
      case (#lose) {
        balanceChange := -bet.toInt();
      };
    };

    currentBalance += balanceChange;
    userBalances.add(caller, currentBalance);
    casinoWallet -= balanceChange;

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

    // Update stats
    let prevGames = switch (userTotalGamesPlayed.get(caller)) {
      case (?n) { n }; case (null) { 0 };
    };
    userTotalGamesPlayed.add(caller, prevGames + 1);

    if (result == #win and balanceChange > 0) {
      dailyWinners.add({ user = caller; amount = balanceChange });
      let prevWon = switch (userTotalCreditsWon.get(caller)) {
        case (?n) { n }; case (null) { 0 };
      };
      userTotalCreditsWon.add(caller, prevWon + balanceChange);

      // Add points for winning
      let prevPoints = switch (userPoints.get(caller)) {
        case (?n) { n }; case (null) { 0 };
      };
      userPoints.add(caller, prevPoints + balanceChange);
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
    let shuffled = sortedList.sort(compareByRandom);
    shuffled.sliceToArray(0, Int.abs(Nat.min(10, shuffled.size())));
  };

  // Products system
  public shared ({ caller }) func addProduct(name : Text, description : Text, category : Text, pointPrice : Nat) : async Product {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can add products");
    };

    let product : Product = {
      id = nextProductId.toText();
      name;
      description;
      category;
      pointPrice;
      available = true;
    };
    productsMap.add(product.id, product);
    nextProductId += 1;
    product;
  };

  public shared ({ caller }) func updateProduct(id : Text, name : Text, description : Text, category : Text, pointPrice : Nat, available : Bool) : async Product {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can update products");
    };

    let product : Product = {
      id;
      name;
      description;
      category;
      pointPrice;
      available;
    };
    productsMap.add(id, product);
    product;
  };

  public shared ({ caller }) func removeProduct(id : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can remove products");
    };
    switch (productsMap.get(id)) {
      case (?product) {
        let updatedProduct : Product = {
          product with available = false;
        };
        productsMap.add(id, updatedProduct);
      };
      case (null) {
        Runtime.trap("Product not found");
      };
    };
  };

  public query func getAllProducts() : async [Product] {
    let all = productsMap.values().toArray();
    all.filter(func(p) { p.available });
  };

  public query ({ caller }) func getAllProductsAdmin() : async [Product] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can view all products");
    };
    productsMap.values().toArray();
  };

  // Redemption system
  public shared ({ caller }) func redeemProduct(productId : Text) : async RedemptionRequest {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can redeem products");
    };

    let product = switch (productsMap.get(productId)) {
      case (?p) { p };
      case (null) {
        Runtime.trap("Product not found");
      };
    };

    if (not product.available) {
      Runtime.trap("Product is not available");
    };

    let userPointsBalance = switch (userPoints.get(caller)) {
      case (?points) { points };
      case (null) { 0 };
    };

    if (userPointsBalance < product.pointPrice) {
      Runtime.trap("Not enough points to redeem this product");
    };

    userPoints.add(caller, userPointsBalance - product.pointPrice);
    let userName = switch (userProfiles.get(caller)) {
      case (?profile) { profile.name };
      case (null) { "Anonymous" };
    };

    let redemption : RedemptionRequest = {
      id = nextRedemptionId.toText();
      user = caller;
      userName;
      productId = product.id;
      productName = product.name;
      pointPrice = product.pointPrice;
      timestamp = Time.now();
      status = "Pending";
    };
    redemptionsMap.add(redemption.id, redemption);
    nextRedemptionId += 1;
    redemption;
  };

  public query ({ caller }) func getAllRedemptions() : async [RedemptionRequest] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can view redemption requests");
    };
    redemptionsMap.values().toArray();
  };

  public shared ({ caller }) func updateRedemptionStatus(id : Text, status : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can update redemption status");
    };
    switch (redemptionsMap.get(id)) {
      case (?redemption) {
        let updatedRedemption : RedemptionRequest = {
          redemption with status;
        };
        redemptionsMap.add(id, updatedRedemption);
      };
      case (null) {
        Runtime.trap("Redemption request not found");
      };
    };
  };

  public query ({ caller }) func getMyRedemptions() : async [RedemptionRequest] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view redemption requests");
    };
    let all = redemptionsMap.values().toArray();
    all.filter(func(r) { r.user == caller });
  };

  public shared ({ caller }) func recordGameOutcome(gameType : GameType, bet : Nat, won : Bool, winAmount : Nat) : async UserGame {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can play games");
    };

    var currentBalance = switch (userBalances.get(caller)) {
      case (?balance) { balance };
      case (null) { 0 };
    };
    if (bet > Int.abs(currentBalance)) {
      Runtime.trap("Not enough credits to place bet");
    };

    currentBalance -= bet;

    let result : GameResult = if (won) { #win } else { #lose };
    var balanceChange : Int = 0;

    if (won) {
      balanceChange := winAmount.toInt();
      currentBalance += winAmount;
    } else {
      balanceChange := -bet.toInt();
    };

    userBalances.add(caller, currentBalance);
    casinoWallet -= balanceChange;

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

    let prevGames = switch (userTotalGamesPlayed.get(caller)) {
      case (?n) { n }; case (null) { 0 };
    };
    userTotalGamesPlayed.add(caller, prevGames + 1);

    if (won and winAmount > 0) {
      dailyWinners.add({ user = caller; amount = balanceChange });
      let prevWon = switch (userTotalCreditsWon.get(caller)) {
        case (?n) { n }; case (null) { 0 };
      };
      userTotalCreditsWon.add(caller, prevWon + balanceChange);

      let prevPoints = switch (userPoints.get(caller)) {
        case (?n) { n }; case (null) { 0 };
      };
      userPoints.add(caller, prevPoints + winAmount);
    };

    newGame;
  };

  // Username system
  public shared ({ caller }) func setUsername(username : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can set username");
    };

    validateUsername(username);

    switch (usernameToOwner.get(username)) {
      case (?existingOwner) {
        if (existingOwner == caller) {
          Runtime.trap("Username already exists");
        };
        Runtime.trap("Username already exists");
      };
      case (null) {};
    };

    switch (ownerToUsername.get(caller)) {
      case (?prevUsername) { usernameToOwner.remove(prevUsername) };
      case (null) {};
    };

    usernameToOwner.add(username, caller);
    ownerToUsername.add(caller, username);

    let userProfile = switch (userProfiles.get(caller)) {
      case (?profile) {
        {
          profile with
          username
        };
      };
      case (null) { Runtime.trap("User profile not found. Please save profile first") };
    };
    userProfiles.add(caller, userProfile);
  };

  func validateUsername(username : Text) {
    if (username.size() < 4) {
      Runtime.trap("Username must be at least 4 characters");
    };
    if (username.size() > 7) {
      Runtime.trap("Username must be less than 8 characters");
    };

    var hasDigit = false;
    var digitCount = 0;
    var consecutiveDigits = 0;
    var hasAlpha = false;

    var consecutiveSameChars = 1;
    var lastChar : ?Char = null;

    for (c in username.chars()) {
      if (c == ' ') { Runtime.trap("Spaces are not allowed") };

      let isDigit = c >= '0' and c <= '9';
      let isAlpha = (c >= 'a' and c <= 'z') or (c >= 'A' and c <= 'Z');

      if (isDigit) {
        hasDigit := true;
        digitCount += 1;
        consecutiveDigits += 1;
      } else if (isAlpha) {
        hasAlpha := true;
        if (consecutiveDigits > 0) { consecutiveDigits := 0 };
      };

      switch (lastChar) {
        case (?last) {
          if (c == last) { consecutiveSameChars += 1 };
          if (consecutiveSameChars > 3) {
            Runtime.trap("No more than 3 consecutive characters allowed (" # c.toText() # ")");
          };
        };
        case (null) {};
      };
      lastChar := ?c;
    };

    if (not hasDigit or digitCount < 2) { Runtime.trap("At least 2 digits required") };
    if (not hasAlpha) { Runtime.trap("At least 1 letter required") };
    if (consecutiveDigits > 3) { Runtime.trap("No more than 3 consecutive digits") };
  };

  public query func getUsernameByPrincipal(user : Principal) : async ?Text {
    ownerToUsername.get(user);
  };

  public query ({ caller }) func getUserByUsername(username : Text) : async ?Principal {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can get user by username");
    };
    if (username.trim(#char ' ').size() == 0) { return null };
    usernameToOwner.get(username);
  };

  public shared ({ caller }) func addCreditsByUsername(username : Text, amount : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can add credits");
    };

    if (username.trim(#char ' ').size() == 0) {
      Runtime.trap("Username cannot be empty");
    };

    let user = switch (usernameToOwner.get(username)) {
      case (?user) { user };
      case (null) { Runtime.trap("Username not found") };
    };

    var currentBalance = switch (userBalances.get(user)) {
      case (?balance) { balance }; case (null) { 0 };
    };
    currentBalance += amount;
    userBalances.add(user, currentBalance);
  };

  // Friends system
  public shared ({ caller }) func sendFriendRequest(toUsername : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can send friend requests");
    };

    if (toUsername.trim(#char ' ').size() == 0) { Runtime.trap("Username cannot be empty") };

    let toPrincipal = switch (usernameToOwner.get(toUsername)) {
      case (?p) { p };
      case (null) { Runtime.trap("User not found") };
    };

    if (caller == toPrincipal) { Runtime.trap("Cannot add yourself as friend") };

    let existingFriendsCaller = switch (friendsListMap.get(caller)) {
      case (?list) { list };
      case (null) { List.empty<Principal>() };
    };
    if (existingFriendsCaller.any(func(p) { p == toPrincipal })) {
      Runtime.trap("Already friends");
    };

    let existingFriendsRecipient = switch (friendsListMap.get(toPrincipal)) {
      case (?list) { list };
      case (null) { List.empty<Principal>() };
    };
    if (existingFriendsRecipient.any(func(p) { p == caller })) {
      Runtime.trap("Already friends");
    };

    let existingRequests = switch (pendingRequestsMap.get(toPrincipal)) {
      case (?requests) { requests };
      case (null) { List.empty<FriendRequest>() };
    };
    if (existingRequests.any(func(req) { req.from == caller })) {
      Runtime.trap("Friend request already sent");
    };

    let newRequest : FriendRequest = {
      from = caller;
      to = toPrincipal;
      timestamp = Time.now();
    };

    let updatedRequests = switch (pendingRequestsMap.get(toPrincipal)) {
      case (?requests) {
        requests.add(newRequest);
        requests;
      };
      case (null) {
        let newList = List.empty<FriendRequest>();
        newList.add(newRequest);
        newList;
      };
    };
    pendingRequestsMap.add(toPrincipal, updatedRequests);
  };

  public shared ({ caller }) func respondFriendRequest(fromPrincipal : Principal, accept : Bool) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can respond to friend requests");
    };

    if (fromPrincipal == caller) { Runtime.trap("Invalid operation") };

    let callerRequests = switch (pendingRequestsMap.get(caller)) {
      case (?requests) { requests };
      case (null) { List.empty<FriendRequest>() };
    };

    let hasRequest = callerRequests.any(func(r) { r.from == fromPrincipal });
    if (not hasRequest) {
      Runtime.trap("Friend request not found");
    };

    pendingRequestsMap.add(
      caller,
      callerRequests.filter(func(r) { r.from != fromPrincipal })
    );

    if (accept) {
      let callerFriends = switch (friendsListMap.get(caller)) {
        case (?list) { list };
        case (null) { List.empty<Principal>() };
      };
      if (not callerFriends.any(func(p) { p == fromPrincipal })) {
        let newCallerFriends = List.empty<Principal>();
        newCallerFriends.add(fromPrincipal);
        callerFriends.values().toArray().forEach(func(friend) { newCallerFriends.add(friend) });
        friendsListMap.add(caller, newCallerFriends);
      };

      let fromFriends = switch (friendsListMap.get(fromPrincipal)) {
        case (?list) { list };
        case (null) { List.empty<Principal>() };
      };
      if (not fromFriends.any(func(p) { p == caller })) {
        let newFromFriends = List.empty<Principal>();
        newFromFriends.add(caller);
        fromFriends.values().toArray().forEach(func(friend) { newFromFriends.add(friend) });
        friendsListMap.add(fromPrincipal, newFromFriends);
      };
    };
  };

  public shared ({ caller }) func removeFriend(friendPrincipal : Principal) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can remove friends");
    };

    let existingFriends = switch (friendsListMap.get(caller)) {
      case (?list) { list };
      case (null) { List.empty<Principal>() };
    };
    if (not existingFriends.any(func(p) { p == friendPrincipal })) {
      Runtime.trap("Friend not found in friend list");
    };

    pendingRequestsMap.remove(friendPrincipal);

    let updatedFriendsCaller = existingFriends.filter(func(p) { p != friendPrincipal });
    friendsListMap.add(caller, updatedFriendsCaller);

    let friendsList = switch (friendsListMap.get(friendPrincipal)) {
      case (?list) { list };
      case (null) { List.empty<Principal>() };
    };
    let updatedFriendsOther = friendsList.filter(func(p) { p != caller });
    friendsListMap.add(friendPrincipal, updatedFriendsOther);
  };

  public query ({ caller }) func getFriendRequests() : async [{ from : Principal; fromUsername : Text; timestamp : Time.Time }] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };

    let requests = switch (pendingRequestsMap.get(caller)) {
      case (?requests) { requests };
      case (null) { List.empty<FriendRequest>() };
    };

    let filteredRequests = requests.filter(
      func(req) { req.from != caller }
    );

    filteredRequests.toArray().map(
      func(req) {
        {
          from = req.from;
          fromUsername = switch (ownerToUsername.get(req.from)) {
            case (?username) { username }; case (null) { "" };
          };
          timestamp = req.timestamp;
        };
      }
    );
  };

  public query ({ caller }) func getFriends() : async [FriendInfo] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };

    let friends = switch (friendsListMap.get(caller)) {
      case (?friends) { friends };
      case (null) { List.empty<Principal>() };
    };

    friends.toArray().filter(
      func(p) {
        let isValid = switch (ownerToUsername.get(p)) {
          case (?username) {
            username != "" and username.trim(#char ' ').size() > 0
          };
          case (null) { false };
        };
        isValid;
      }
    ).map(
      func(p) { { principal = p; username = switch (ownerToUsername.get(p)) { case (?u) { u }; case (null) { "" } } } }
    );
  };

  // Game Challenge System
  public shared ({ caller }) func sendGameChallenge(toUsername : Text, gameType : GameType, bet : Nat) : async GameChallenge {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can send game challenges");
    };

    if (toUsername.trim(#char ' ').size() == 0) {
      Runtime.trap("Username cannot be empty");
    };

    let toPrincipal = switch (usernameToOwner.get(toUsername)) {
      case (?p) { p };
      case (null) { Runtime.trap("User not found") };
    };

    if (caller == toPrincipal) {
      Runtime.trap("Cannot challenge yourself");
    };

    // Verify friendship
    let callerFriends = switch (friendsListMap.get(caller)) {
      case (?list) { list };
      case (null) { List.empty<Principal>() };
    };
    if (not callerFriends.any(func(p) { p == toPrincipal })) {
      Runtime.trap("Can only challenge friends");
    };

    let challenge : GameChallenge = {
      id = nextChallengeId.toText();
      from = caller;
      to = toPrincipal;
      gameType;
      bet;
      timestamp = Time.now();
      status = "Pending";
    };

    challengesMap.add(challenge.id, challenge);
    nextChallengeId += 1;
    challenge;
  };

  public shared ({ caller }) func respondGameChallenge(challengeId : Text, accept : Bool) : async GameChallenge {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can respond to challenges");
    };

    let challenge = switch (challengesMap.get(challengeId)) {
      case (?c) { c };
      case (null) { Runtime.trap("Challenge not found") };
    };

    // Only the recipient can respond
    if (challenge.to != caller) {
      Runtime.trap("Unauthorized: Only the challenge recipient can respond");
    };

    if (challenge.status != "Pending") {
      Runtime.trap("Challenge is no longer pending");
    };

    let newStatus = if (accept) { "Accepted" } else { "Declined" };
    let updatedChallenge : GameChallenge = {
      challenge with status = newStatus;
    };

    challengesMap.add(challengeId, updatedChallenge);
    updatedChallenge;
  };

  public query ({ caller }) func getPendingChallenges() : async [GameChallenge] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view challenges");
    };

    let allChallenges = challengesMap.values().toArray();
    allChallenges.filter(
      func(c) { c.to == caller and c.status == "Pending" }
    );
  };

  public query ({ caller }) func getSentChallenges() : async [GameChallenge] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view challenges");
    };

    let allChallenges = challengesMap.values().toArray();
    allChallenges.filter(
      func(c) { c.from == caller }
    );
  };

  public shared ({ caller }) func cancelGameChallenge(challengeId : Text) : async GameChallenge {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can cancel challenges");
    };

    let challenge = switch (challengesMap.get(challengeId)) {
      case (?c) { c };
      case (null) { Runtime.trap("Challenge not found") };
    };

    // Only the sender can cancel
    if (challenge.from != caller) {
      Runtime.trap("Unauthorized: Only the challenge sender can cancel");
    };

    if (challenge.status != "Pending") {
      Runtime.trap("Can only cancel pending challenges");
    };

    let updatedChallenge : GameChallenge = {
      challenge with status = "Declined";
    };

    challengesMap.add(challengeId, updatedChallenge);
    updatedChallenge;
  };

};
