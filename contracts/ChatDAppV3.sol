// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title ChatDApp v3.0 - WhatsApp-like Decentralized Chat
 * @notice Private 1-to-1 messaging with user profiles, reactions, and advanced features
 * @dev Optimized for Celo Sepolia with efficient storage patterns
 */
contract ChatDAppV3 {
    // ========== STRUCTS ==========
    
    struct UserProfile {
        string username;
        string avatarUrl;
        string status;
        uint256 createdAt;
        uint256 lastSeen;
        bool isRegistered;
    }
    
    struct PrivateMessage {
        address sender;
        string content;
        uint256 timestamp;
        bool isRead;
        bool isDeleted;
        string messageType; // "text", "image", "file"
    }
    
    struct ChatMetadata {
        address user1;
        address user2;
        uint256 messageCount;
        uint256 lastMessageTime;
        bool exists;
    }
    
    struct MessageReaction {
        address reactor;
        string emoji;
        uint256 timestamp;
    }
    
    // ========== STATE VARIABLES ==========
    
    // User management
    mapping(address => UserProfile) public users;
    mapping(string => address) public usernameToAddress;
    address[] public registeredUsers;
    
    // Private chats: chatId => messages
    mapping(bytes32 => PrivateMessage[]) private privateChats;
    mapping(bytes32 => ChatMetadata) public chatMetadata;
    
    // Message reactions: chatId => messageIndex => reactions
    mapping(bytes32 => mapping(uint256 => MessageReaction[])) public messageReactions;
    
    // Message read receipts: chatId => messageIndex => reader => isRead
    mapping(bytes32 => mapping(uint256 => mapping(address => bool))) public readReceipts;
    
    // Rate limiting
    mapping(address => uint256) public lastMessageTime;
    uint256 public constant RATE_LIMIT = 1 seconds; // 1 second for demo, increase for production
    
    // Constraints
    uint256 public constant MIN_USERNAME_LENGTH = 3;
    uint256 public constant MAX_USERNAME_LENGTH = 20;
    uint256 public constant MAX_MESSAGE_LENGTH = 500;
    uint256 public constant MAX_STATUS_LENGTH = 100;
    uint256 public constant PAGINATION_LIMIT = 50;
    
    // ========== EVENTS ==========
    
    event UserRegistered(address indexed user, string username, uint256 timestamp);
    event ProfileUpdated(address indexed user, string username, string avatarUrl, string status);
    event PrivateMessageSent(
        bytes32 indexed chatId,
        address indexed sender,
        address indexed recipient,
        uint256 messageIndex,
        uint256 timestamp
    );
    event MessageRead(bytes32 indexed chatId, uint256 messageIndex, address indexed reader);
    event MessageDeleted(bytes32 indexed chatId, uint256 messageIndex, address indexed deleter);
    event MessageReacted(bytes32 indexed chatId, uint256 messageIndex, address indexed reactor, string emoji);
    event ChatStarted(bytes32 indexed chatId, address indexed user1, address indexed user2);
    
    // ========== ERRORS ==========
    
    error UserAlreadyRegistered();
    error UserNotRegistered();
    error UsernameInvalid();
    error UsernameTaken();
    error UsernameTooShort(uint256 provided, uint256 min);
    error UsernameTooLong(uint256 provided, uint256 max);
    error MessageEmpty();
    error MessageTooLong(uint256 provided, uint256 max);
    error StatusTooLong(uint256 provided, uint256 max);
    error RateLimitExceeded(uint256 timeRemaining);
    error ChatDoesNotExist();
    error MessageDoesNotExist();
    error NotMessageSender();
    error InvalidRecipient();
    error SelfMessageNotAllowed();
    
    // ========== MODIFIERS ==========
    
    modifier onlyRegistered() {
        if (!users[msg.sender].isRegistered) revert UserNotRegistered();
        _;
    }
    
    modifier rateLimited() {
        uint256 timeSinceLastMessage = block.timestamp - lastMessageTime[msg.sender];
        if (timeSinceLastMessage < RATE_LIMIT) {
            revert RateLimitExceeded(RATE_LIMIT - timeSinceLastMessage);
        }
        _;
        lastMessageTime[msg.sender] = block.timestamp;
    }
    
    // ========== USER MANAGEMENT ==========
    
    /**
     * @notice Register a new user with username
     * @param _username Unique username (3-20 characters)
     */
    function registerUser(string calldata _username) external {
        if (users[msg.sender].isRegistered) revert UserAlreadyRegistered();
        
        uint256 usernameLen = bytes(_username).length;
        if (usernameLen < MIN_USERNAME_LENGTH) revert UsernameTooShort(usernameLen, MIN_USERNAME_LENGTH);
        if (usernameLen > MAX_USERNAME_LENGTH) revert UsernameTooLong(usernameLen, MAX_USERNAME_LENGTH);
        if (usernameToAddress[_username] != address(0)) revert UsernameTaken();
        if (bytes(_username).length == 0) revert UsernameInvalid();
        
        users[msg.sender] = UserProfile({
            username: _username,
            avatarUrl: "",
            status: "Hey there! I'm using ChatDApp",
            createdAt: block.timestamp,
            lastSeen: block.timestamp,
            isRegistered: true
        });
        
        usernameToAddress[_username] = msg.sender;
        registeredUsers.push(msg.sender);
        
        emit UserRegistered(msg.sender, _username, block.timestamp);
    }
    
    /**
     * @notice Update user profile (avatar and status)
     * @param _avatarUrl New avatar URL (optional)
     * @param _status New status message (max 100 chars)
     */
    function updateProfile(string calldata _avatarUrl, string calldata _status) external onlyRegistered {
        uint256 statusLen = bytes(_status).length;
        if (statusLen > MAX_STATUS_LENGTH) revert StatusTooLong(statusLen, MAX_STATUS_LENGTH);
        
        UserProfile storage profile = users[msg.sender];
        profile.avatarUrl = _avatarUrl;
        profile.status = _status;
        profile.lastSeen = block.timestamp;
        
        emit ProfileUpdated(msg.sender, profile.username, _avatarUrl, _status);
    }
    
    /**
     * @notice Update last seen timestamp
     */
    function updateLastSeen() external onlyRegistered {
        users[msg.sender].lastSeen = block.timestamp;
    }
    
    /**
     * @notice Get user profile by address
     * @param _user User address
     * @return UserProfile struct
     */
    function getUserProfile(address _user) external view returns (UserProfile memory) {
        return users[_user];
    }
    
    /**
     * @notice Get address by username
     * @param _username Username to lookup
     * @return User address
     */
    function getAddressByUsername(string calldata _username) external view returns (address) {
        return usernameToAddress[_username];
    }
    
    /**
     * @notice Get total registered users count
     * @return Total users
     */
    function getTotalUsers() external view returns (uint256) {
        return registeredUsers.length;
    }
    
    /**
     * @notice Get paginated list of registered users
     * @param _offset Starting index
     * @param _limit Number of users to return (max 50)
     * @return Array of user addresses
     */
    function getRegisteredUsers(uint256 _offset, uint256 _limit) external view returns (address[] memory) {
        uint256 limit = _limit > PAGINATION_LIMIT ? PAGINATION_LIMIT : _limit;
        uint256 total = registeredUsers.length;
        
        if (_offset >= total) return new address[](0);
        
        uint256 end = _offset + limit;
        if (end > total) end = total;
        
        uint256 resultLength = end - _offset;
        address[] memory result = new address[](resultLength);
        
        for (uint256 i = 0; i < resultLength;) {
            result[i] = registeredUsers[_offset + i];
            unchecked { ++i; }
        }
        
        return result;
    }
    
    // ========== PRIVATE CHAT FUNCTIONS ==========
    
    /**
     * @notice Generate deterministic chat ID for two users
     * @dev Sorted to ensure same chatId regardless of order
     * @param _user1 First user address
     * @param _user2 Second user address
     * @return Unique chat identifier
     */
    function getChatId(address _user1, address _user2) public pure returns (bytes32) {
        if (_user1 == _user2) revert SelfMessageNotAllowed();
        
        // Sort addresses to ensure deterministic chatId
        (address lower, address higher) = _user1 < _user2 ? (_user1, _user2) : (_user2, _user1);
        return keccak256(abi.encodePacked(lower, higher));
    }
    
    /**
     * @notice Start a new private chat (creates metadata if doesn't exist)
     * @param _recipient Recipient address
     * @return chatId Unique chat identifier
     */
    function startPrivateChat(address _recipient) external onlyRegistered returns (bytes32) {
        if (!users[_recipient].isRegistered) revert InvalidRecipient();
        if (_recipient == msg.sender) revert SelfMessageNotAllowed();
        
        bytes32 chatId = getChatId(msg.sender, _recipient);
        
        if (!chatMetadata[chatId].exists) {
            chatMetadata[chatId] = ChatMetadata({
                user1: msg.sender,
                user2: _recipient,
                messageCount: 0,
                lastMessageTime: block.timestamp,
                exists: true
            });
            
            emit ChatStarted(chatId, msg.sender, _recipient);
        }
        
        return chatId;
    }
    
    /**
     * @notice Send a private message to another user
     * @param _recipient Recipient address
     * @param _content Message content
     * @param _messageType Type of message ("text", "image", "file")
     */
    function sendPrivateMessage(
        address _recipient,
        string calldata _content,
        string calldata _messageType
    ) external onlyRegistered rateLimited {
        uint256 contentLen = bytes(_content).length;
        if (contentLen == 0) revert MessageEmpty();
        if (contentLen > MAX_MESSAGE_LENGTH) revert MessageTooLong(contentLen, MAX_MESSAGE_LENGTH);
        if (!users[_recipient].isRegistered) revert InvalidRecipient();
        if (_recipient == msg.sender) revert SelfMessageNotAllowed();
        
        bytes32 chatId = getChatId(msg.sender, _recipient);
        
        // Initialize chat metadata if first message
        if (!chatMetadata[chatId].exists) {
            chatMetadata[chatId] = ChatMetadata({
                user1: msg.sender,
                user2: _recipient,
                messageCount: 0,
                lastMessageTime: block.timestamp,
                exists: true
            });
            
            emit ChatStarted(chatId, msg.sender, _recipient);
        }
        
        // Add message
        privateChats[chatId].push(PrivateMessage({
            sender: msg.sender,
            content: _content,
            timestamp: block.timestamp,
            isRead: false,
            isDeleted: false,
            messageType: _messageType
        }));
        
        uint256 messageIndex = privateChats[chatId].length - 1;
        
        // Update metadata
        chatMetadata[chatId].messageCount++;
        chatMetadata[chatId].lastMessageTime = block.timestamp;
        
        emit PrivateMessageSent(chatId, msg.sender, _recipient, messageIndex, block.timestamp);
    }
    
    /**
     * @notice Mark a message as read
     * @param _chatId Chat identifier
     * @param _messageIndex Message index
     */
    function markMessageAsRead(bytes32 _chatId, uint256 _messageIndex) external onlyRegistered {
        if (!chatMetadata[_chatId].exists) revert ChatDoesNotExist();
        if (_messageIndex >= privateChats[_chatId].length) revert MessageDoesNotExist();
        
        PrivateMessage storage message = privateChats[_chatId][_messageIndex];
        
        // Only recipient can mark as read, not sender
        if (message.sender != msg.sender) {
            message.isRead = true;
            readReceipts[_chatId][_messageIndex][msg.sender] = true;
            emit MessageRead(_chatId, _messageIndex, msg.sender);
        }
    }
    
    /**
     * @notice Delete a message (soft delete)
     * @param _chatId Chat identifier
     * @param _messageIndex Message index
     */
    function deleteMessage(bytes32 _chatId, uint256 _messageIndex) external onlyRegistered {
        if (!chatMetadata[_chatId].exists) revert ChatDoesNotExist();
        if (_messageIndex >= privateChats[_chatId].length) revert MessageDoesNotExist();
        
        PrivateMessage storage message = privateChats[_chatId][_messageIndex];
        if (message.sender != msg.sender) revert NotMessageSender();
        
        message.isDeleted = true;
        message.content = "This message was deleted";
        
        emit MessageDeleted(_chatId, _messageIndex, msg.sender);
    }
    
    /**
     * @notice Add reaction to a message
     * @param _chatId Chat identifier
     * @param _messageIndex Message index
     * @param _emoji Emoji reaction
     */
    function addReaction(bytes32 _chatId, uint256 _messageIndex, string calldata _emoji) external onlyRegistered {
        if (!chatMetadata[_chatId].exists) revert ChatDoesNotExist();
        if (_messageIndex >= privateChats[_chatId].length) revert MessageDoesNotExist();
        
        messageReactions[_chatId][_messageIndex].push(MessageReaction({
            reactor: msg.sender,
            emoji: _emoji,
            timestamp: block.timestamp
        }));
        
        emit MessageReacted(_chatId, _messageIndex, msg.sender, _emoji);
    }
    
    /**
     * @notice Get private messages between two users (paginated)
     * @param _otherUser Other user address
     * @param _offset Starting index
     * @param _limit Number of messages (max 50)
     * @return Array of messages
     */
    function getPrivateMessages(
        address _otherUser,
        uint256 _offset,
        uint256 _limit
    ) external view returns (PrivateMessage[] memory) {
        bytes32 chatId = getChatId(msg.sender, _otherUser);
        
        uint256 limit = _limit > PAGINATION_LIMIT ? PAGINATION_LIMIT : _limit;
        uint256 total = privateChats[chatId].length;
        
        if (_offset >= total) return new PrivateMessage[](0);
        
        uint256 end = _offset + limit;
        if (end > total) end = total;
        
        uint256 resultLength = end - _offset;
        PrivateMessage[] memory result = new PrivateMessage[](resultLength);
        
        for (uint256 i = 0; i < resultLength;) {
            result[i] = privateChats[chatId][_offset + i];
            unchecked { ++i; }
        }
        
        return result;
    }
    
    /**
     * @notice Get total message count in a chat
     * @param _otherUser Other user address
     * @return Total messages
     */
    function getMessageCount(address _otherUser) external view returns (uint256) {
        bytes32 chatId = getChatId(msg.sender, _otherUser);
        return privateChats[chatId].length;
    }
    
    /**
     * @notice Get chat metadata
     * @param _otherUser Other user address
     * @return ChatMetadata struct
     */
    function getChatMetadata(address _otherUser) external view returns (ChatMetadata memory) {
        bytes32 chatId = getChatId(msg.sender, _otherUser);
        return chatMetadata[chatId];
    }
    
    /**
     * @notice Get reactions for a specific message
     * @param _chatId Chat identifier
     * @param _messageIndex Message index
     * @return Array of reactions
     */
    function getMessageReactions(bytes32 _chatId, uint256 _messageIndex) external view returns (MessageReaction[] memory) {
        return messageReactions[_chatId][_messageIndex];
    }
    
    /**
     * @notice Check if user is registered
     * @param _user User address
     * @return Boolean
     */
    function isUserRegistered(address _user) external view returns (bool) {
        return users[_user].isRegistered;
    }
}
