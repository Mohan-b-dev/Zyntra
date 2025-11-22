// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title ChatDApp v4.0 - Ultra-Optimized Decentralized Chat
 * @notice Private messaging with glass-morphism UI, real-time updates, gas optimization
 * @dev Packed structs, calldata strings, custom errors, efficient indexing
 */
contract ChatDAppV4 {
    // ========== PACKED STRUCTS (Gas Optimized) ==========
    
    struct UserProfile {
        address userAddress;      // 20 bytes
        uint48 createdAt;         // 6 bytes (timestamp until year 8921556)
        uint48 lastSeen;          // 6 bytes
        bool isRegistered;        // 1 byte
        // Next slot
        string username;
        string avatarUrl;
        string status;
    }
    
    struct PrivateMessage {
        address sender;           // 20 bytes
        uint48 timestamp;         // 6 bytes
        uint8 messageType;        // 1 byte: 0=text, 1=image, 2=file
        bool isRead;              // 1 byte
        bool isDeleted;           // 1 byte
        // Next slot
        string content;
    }
    
    struct ChatMetadata {
        address user1;            // 20 bytes
        address user2;            // 20 bytes (packed together)
        uint48 lastMessageTime;   // 6 bytes
        uint32 messageCount;      // 4 bytes
        bool exists;              // 1 byte
    }
    
    struct MessageReaction {
        address reactor;          // 20 bytes
        uint48 timestamp;         // 6 bytes
        // Next slot
        string emoji;
    }
    
    // ========== STATE VARIABLES ==========
    
    // User management
    mapping(address => UserProfile) private users;
    mapping(string => address) private usernameToAddress;
    address[] private registeredUsers;
    
    // Private chats: chatId => messages
    mapping(bytes32 => PrivateMessage[]) private privateChats;
    mapping(bytes32 => ChatMetadata) private chatMetadata;
    
    // Message reactions: chatId => messageIndex => reactions
    mapping(bytes32 => mapping(uint256 => MessageReaction[])) private messageReactions;
    
    // Rate limiting
    mapping(address => uint48) private lastMessageTime;
    uint48 private constant RATE_LIMIT = 1; // 1 second
    
    // Constraints
    uint8 private constant MIN_USERNAME_LENGTH = 3;
    uint8 private constant MAX_USERNAME_LENGTH = 20;
    uint16 private constant MAX_MESSAGE_LENGTH = 500;
    uint8 private constant MAX_STATUS_LENGTH = 100;
    uint8 private constant PAGINATION_LIMIT = 50;
    
    // ========== EVENTS ==========
    
    event UserRegistered(
        address indexed user,
        string username,
        uint48 timestamp
    );
    
    event ProfileUpdated(
        address indexed user,
        string username,
        string avatarUrl,
        string status
    );
    
    event PrivateMessageSent(
        bytes32 indexed chatId,
        address indexed sender,
        address indexed recipient,
        uint256 messageIndex,
        uint48 timestamp,
        string preview // First 50 chars for notifications
    );
    
    event MessageRead(
        bytes32 indexed chatId,
        uint256 messageIndex,
        address indexed reader
    );
    
    event MessageDeleted(
        bytes32 indexed chatId,
        uint256 messageIndex,
        address indexed deleter
    );
    
    event MessageReacted(
        bytes32 indexed chatId,
        uint256 messageIndex,
        address indexed reactor,
        string emoji
    );
    
    event ChatStarted(
        bytes32 indexed chatId,
        address indexed user1,
        address indexed user2
    );
    
    // ========== CUSTOM ERRORS ==========
    
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
    error InvalidMessageIndex();
    error UnauthorizedAccess();
    error InvalidPagination();
    
    // ========== MODIFIERS ==========
    
    modifier onlyRegistered() {
        if (!users[msg.sender].isRegistered) revert UserNotRegistered();
        _;
    }
    
    modifier validUsername(string calldata _username) {
        bytes memory usernameBytes = bytes(_username);
        if (usernameBytes.length < MIN_USERNAME_LENGTH) {
            revert UsernameTooShort(usernameBytes.length, MIN_USERNAME_LENGTH);
        }
        if (usernameBytes.length > MAX_USERNAME_LENGTH) {
            revert UsernameTooLong(usernameBytes.length, MAX_USERNAME_LENGTH);
        }
        _;
    }
    
    // ========== USER MANAGEMENT ==========
    
    /**
     * @notice Register a new user with profile
     * @param _username Unique username (3-20 chars)
     * @param _avatarUrl Profile image URL
     * @param _status User status message
     */
    function registerUser(
        string calldata _username,
        string calldata _avatarUrl,
        string calldata _status
    ) external validUsername(_username) {
        if (users[msg.sender].isRegistered) revert UserAlreadyRegistered();
        if (usernameToAddress[_username] != address(0)) revert UsernameTaken();
        if (bytes(_status).length > MAX_STATUS_LENGTH) {
            revert StatusTooLong(bytes(_status).length, MAX_STATUS_LENGTH);
        }
        
        uint48 currentTime = uint48(block.timestamp);
        
        users[msg.sender] = UserProfile({
            userAddress: msg.sender,
            username: _username,
            avatarUrl: _avatarUrl,
            status: _status,
            createdAt: currentTime,
            lastSeen: currentTime,
            isRegistered: true
        });
        
        usernameToAddress[_username] = msg.sender;
        registeredUsers.push(msg.sender);
        
        emit UserRegistered(msg.sender, _username, currentTime);
    }
    
    /**
     * @notice Update user profile
     */
    function updateProfile(
        string calldata _avatarUrl,
        string calldata _status
    ) external onlyRegistered {
        if (bytes(_status).length > MAX_STATUS_LENGTH) {
            revert StatusTooLong(bytes(_status).length, MAX_STATUS_LENGTH);
        }
        
        UserProfile storage user = users[msg.sender];
        user.avatarUrl = _avatarUrl;
        user.status = _status;
        user.lastSeen = uint48(block.timestamp);
        
        emit ProfileUpdated(msg.sender, user.username, _avatarUrl, _status);
    }
    
    /**
     * @notice Get user profile by address
     */
    function getUserProfile(address _user) external view returns (
        string memory username,
        string memory avatarUrl,
        string memory status,
        uint48 createdAt,
        uint48 lastSeen,
        bool isRegistered
    ) {
        UserProfile memory user = users[_user];
        return (
            user.username,
            user.avatarUrl,
            user.status,
            user.createdAt,
            user.lastSeen,
            user.isRegistered
        );
    }
    
    /**
     * @notice Get address by username
     */
    function getAddressByUsername(string calldata _username) 
        external 
        view 
        returns (address) 
    {
        return usernameToAddress[_username];
    }
    
    /**
     * @notice Get paginated list of registered users
     */
    function getRegisteredUsers(uint256 _offset, uint256 _limit)
        external
        view
        returns (address[] memory)
    {
        if (_limit > PAGINATION_LIMIT) revert InvalidPagination();
        if (_offset >= registeredUsers.length) return new address[](0);
        
        uint256 end = _offset + _limit;
        if (end > registeredUsers.length) {
            end = registeredUsers.length;
        }
        
        uint256 resultLength = end - _offset;
        address[] memory result = new address[](resultLength);
        
        for (uint256 i = 0; i < resultLength;) {
            result[i] = registeredUsers[_offset + i];
            unchecked { ++i; }
        }
        
        return result;
    }
    
    /**
     * @notice Get total registered users count
     */
    function getTotalUsers() external view returns (uint256) {
        return registeredUsers.length;
    }
    
    // ========== PRIVATE MESSAGING ==========
    
    /**
     * @notice Generate deterministic chat ID for two users
     */
    function getChatId(address _user1, address _user2) 
        public 
        pure 
        returns (bytes32) 
    {
        return _user1 < _user2 
            ? keccak256(abi.encodePacked(_user1, _user2))
            : keccak256(abi.encodePacked(_user2, _user1));
    }
    
    /**
     * @notice Send a private message (gas optimized)
     * @param _recipient Recipient address
     * @param _content Message content
     * @param _messageType 0=text, 1=image, 2=file
     */
    function sendPrivateMessage(
        address _recipient,
        string calldata _content,
        uint8 _messageType
    ) external onlyRegistered {
        if (!users[_recipient].isRegistered) revert UserNotRegistered();
        if (bytes(_content).length == 0) revert MessageEmpty();
        if (bytes(_content).length > MAX_MESSAGE_LENGTH) {
            revert MessageTooLong(bytes(_content).length, MAX_MESSAGE_LENGTH);
        }
        
        // Rate limiting
        uint48 currentTime = uint48(block.timestamp);
        uint48 timeSinceLastMessage = currentTime - lastMessageTime[msg.sender];
        if (timeSinceLastMessage < RATE_LIMIT) {
            revert RateLimitExceeded(RATE_LIMIT - timeSinceLastMessage);
        }
        
        bytes32 chatId = getChatId(msg.sender, _recipient);
        
        // Initialize chat if needed
        if (!chatMetadata[chatId].exists) {
            chatMetadata[chatId] = ChatMetadata({
                user1: msg.sender < _recipient ? msg.sender : _recipient,
                user2: msg.sender < _recipient ? _recipient : msg.sender,
                messageCount: 0,
                lastMessageTime: currentTime,
                exists: true
            });
            emit ChatStarted(chatId, msg.sender, _recipient);
        }
        
        // Add message
        privateChats[chatId].push(PrivateMessage({
            sender: msg.sender,
            content: _content,
            timestamp: currentTime,
            isRead: false,
            isDeleted: false,
            messageType: _messageType
        }));
        
        uint256 messageIndex = privateChats[chatId].length - 1;
        
        // Update metadata
        ChatMetadata storage metadata = chatMetadata[chatId];
        metadata.messageCount = uint32(messageIndex + 1);
        metadata.lastMessageTime = currentTime;
        
        // Update rate limit
        lastMessageTime[msg.sender] = currentTime;
        
        // Update last seen
        users[msg.sender].lastSeen = currentTime;
        
        // Emit with preview for notifications
        string memory preview = bytes(_content).length > 50 
            ? string(abi.encodePacked(substring(_content, 0, 50), "..."))
            : _content;
        
        emit PrivateMessageSent(
            chatId,
            msg.sender,
            _recipient,
            messageIndex,
            currentTime,
            preview
        );
    }
    
    /**
     * @notice Get private messages with pagination
     */
    function getPrivateMessages(
        address _otherUser,
        uint256 _offset,
        uint256 _limit
    ) external view onlyRegistered returns (
        PrivateMessage[] memory messages,
        uint256 total
    ) {
        bytes32 chatId = getChatId(msg.sender, _otherUser);
        PrivateMessage[] storage allMessages = privateChats[chatId];
        total = allMessages.length;
        
        if (_offset >= total) return (new PrivateMessage[](0), total);
        if (_limit > PAGINATION_LIMIT) revert InvalidPagination();
        
        uint256 end = _offset + _limit;
        if (end > total) end = total;
        
        uint256 resultLength = end - _offset;
        messages = new PrivateMessage[](resultLength);
        
        for (uint256 i = 0; i < resultLength;) {
            messages[i] = allMessages[_offset + i];
            unchecked { ++i; }
        }
        
        return (messages, total);
    }
    
    /**
     * @notice Mark message as read
     */
    function markMessageAsRead(
        address _otherUser,
        uint256 _messageIndex
    ) external onlyRegistered {
        bytes32 chatId = getChatId(msg.sender, _otherUser);
        
        if (_messageIndex >= privateChats[chatId].length) {
            revert InvalidMessageIndex();
        }
        
        PrivateMessage storage message = privateChats[chatId][_messageIndex];
        
        // Only recipient can mark as read
        if (message.sender != _otherUser) revert UnauthorizedAccess();
        
        message.isRead = true;
        
        emit MessageRead(chatId, _messageIndex, msg.sender);
    }
    
    /**
     * @notice Delete message (soft delete)
     */
    function deleteMessage(
        address _otherUser,
        uint256 _messageIndex
    ) external onlyRegistered {
        bytes32 chatId = getChatId(msg.sender, _otherUser);
        
        if (_messageIndex >= privateChats[chatId].length) {
            revert InvalidMessageIndex();
        }
        
        PrivateMessage storage message = privateChats[chatId][_messageIndex];
        
        // Only sender can delete
        if (message.sender != msg.sender) revert UnauthorizedAccess();
        
        message.isDeleted = true;
        message.content = ""; // Clear content to save gas on future reads
        
        emit MessageDeleted(chatId, _messageIndex, msg.sender);
    }
    
    /**
     * @notice Add reaction to message
     */
    function addReaction(
        address _otherUser,
        uint256 _messageIndex,
        string calldata _emoji
    ) external onlyRegistered {
        bytes32 chatId = getChatId(msg.sender, _otherUser);
        
        if (_messageIndex >= privateChats[chatId].length) {
            revert InvalidMessageIndex();
        }
        
        messageReactions[chatId][_messageIndex].push(MessageReaction({
            reactor: msg.sender,
            emoji: _emoji,
            timestamp: uint48(block.timestamp)
        }));
        
        emit MessageReacted(chatId, _messageIndex, msg.sender, _emoji);
    }
    
    /**
     * @notice Get reactions for a message
     */
    function getMessageReactions(
        address _otherUser,
        uint256 _messageIndex
    ) external view returns (MessageReaction[] memory) {
        bytes32 chatId = getChatId(msg.sender, _otherUser);
        return messageReactions[chatId][_messageIndex];
    }
    
    /**
     * @notice Get chat metadata
     */
    function getChatMetadata(address _otherUser) 
        external 
        view 
        returns (ChatMetadata memory) 
    {
        bytes32 chatId = getChatId(msg.sender, _otherUser);
        return chatMetadata[chatId];
    }
    
    // ========== UTILITY FUNCTIONS ==========
    
    /**
     * @notice Get substring (helper for preview)
     */
    function substring(
        string memory str,
        uint256 startIndex,
        uint256 endIndex
    ) private pure returns (string memory) {
        bytes memory strBytes = bytes(str);
        bytes memory result = new bytes(endIndex - startIndex);
        
        for (uint256 i = startIndex; i < endIndex;) {
            result[i - startIndex] = strBytes[i];
            unchecked { ++i; }
        }
        
        return string(result);
    }
}
