// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title ChatDApp
 * @dev Decentralized chat application with rate limiting, message validation, and user registration
 * @notice Optimized for Celo Sepolia Testnet with reduced gas costs
 */
contract ChatDApp {
    struct Message {
        address sender;
        string text;
        uint256 timestamp;
    }

    struct User {
        string username;
        uint256 createdAt;
        bool isRegistered;
    }

    Message[] public messages;
    mapping(address => uint256) public userLastMessageTime;
    mapping(address => User) public users;

    uint256 public constant RATE_LIMIT_SECONDS = 3;
    uint256 public constant MAX_MESSAGE_LENGTH = 250;
    uint256 public constant MAX_USERNAME_LENGTH = 20;
    uint256 public constant MIN_USERNAME_LENGTH = 3;

    error MessageTooLong(uint256 provided, uint256 max);
    error MessageEmpty();
    error RateLimitExceeded(uint256 timeRemaining);
    error UserNotRegistered();
    error UsernameInvalid();
    error UsernameTooLong(uint256 provided, uint256 max);
    error UsernameTooShort(uint256 provided, uint256 min);
    error UserAlreadyRegistered();

    event NewMessage(address indexed sender, string text, uint256 timestamp);
    event UserRegistered(address indexed user, string username, uint256 timestamp);

    /**
     * @dev Register a new user with a username
     * @param _username The desired username
     * @notice Optimized for gas efficiency on Celo
     */
    function registerUser(string calldata _username) external {
        if (users[msg.sender].isRegistered) {
            revert UserAlreadyRegistered();
        }

        bytes calldata usernameBytes = bytes(_username);
        uint256 length = usernameBytes.length;
        
        if (length == 0) {
            revert UsernameInvalid();
        }
        
        if (length > MAX_USERNAME_LENGTH) {
            revert UsernameTooLong(length, MAX_USERNAME_LENGTH);
        }
        
        if (length < MIN_USERNAME_LENGTH) {
            revert UsernameTooShort(length, MIN_USERNAME_LENGTH);
        }

        users[msg.sender] = User({
            username: _username,
            createdAt: block.timestamp,
            isRegistered: true
        });

        emit UserRegistered(msg.sender, _username, block.timestamp);
    }

    /**
     * @dev Send a new message to the chat
     * @param _text The message text content
     * @notice Optimized for gas efficiency on Celo
     */
    function sendMessage(string calldata _text) external {
        if (!users[msg.sender].isRegistered) {
            revert UserNotRegistered();
        }
        
        bytes calldata textBytes = bytes(_text);
        uint256 length = textBytes.length;
        
        if (length == 0) {
            revert MessageEmpty();
        }
        
        if (length > MAX_MESSAGE_LENGTH) {
            revert MessageTooLong(length, MAX_MESSAGE_LENGTH);
        }

        uint256 lastMessageTime = userLastMessageTime[msg.sender];
        if (lastMessageTime > 0) {
            unchecked {
                uint256 timePassed = block.timestamp - lastMessageTime;
                if (timePassed < RATE_LIMIT_SECONDS) {
                    revert RateLimitExceeded(RATE_LIMIT_SECONDS - timePassed);
                }
            }
        }

        userLastMessageTime[msg.sender] = block.timestamp;

        messages.push(Message({
            sender: msg.sender,
            text: _text,
            timestamp: block.timestamp
        }));

        emit NewMessage(msg.sender, _text, block.timestamp);
    }

    /**
     * @dev Get all messages
     * @return Array of all messages
     */
    function getMessages() external view returns (Message[] memory) {
        return messages;
    }

    /**
     * @dev Get the last N messages
     * @param _count Number of messages to retrieve
     * @return Array of last N messages
     */
    function getLastMessages(uint256 _count) external view returns (Message[] memory) {
        uint256 totalMessages = messages.length;
        
        if (_count >= totalMessages) {
            return messages;
        }

        Message[] memory lastMessages = new Message[](_count);
        uint256 startIndex = totalMessages - _count;

        for (uint256 i = 0; i < _count; i++) {
            lastMessages[i] = messages[startIndex + i];
        }

        return lastMessages;
    }

    /**
     * @dev Get total number of messages
     * @return Total message count
     */
    function getMessageCount() external view returns (uint256) {
        return messages.length;
    }

    /**
     * @dev Get time remaining before user can send next message
     * @param _user Address of the user
     * @return Seconds remaining (0 if can send now)
     */
    function getTimeUntilNextMessage(address _user) external view returns (uint256) {
        uint256 lastMessageTime = userLastMessageTime[_user];
        if (lastMessageTime == 0) {
            return 0;
        }

        uint256 timePassed = block.timestamp - lastMessageTime;
        if (timePassed >= RATE_LIMIT_SECONDS) {
            return 0;
        }

        return RATE_LIMIT_SECONDS - timePassed;
    }

    /**
     * @dev Get user profile
     * @param _user Address of the user
     * @return User struct with username and registration info
     */
    function getUser(address _user) external view returns (User memory) {
        return users[_user];
    }

    /**
     * @dev Check if user is registered
     * @param _user Address of the user
     * @return Boolean indicating registration status
     */
    function isUserRegistered(address _user) external view returns (bool) {
        return users[_user].isRegistered;
    }

    /**
     * @dev Get username for an address
     * @param _user Address of the user
     * @return Username string
     */
    function getUsername(address _user) external view returns (string memory) {
        return users[_user].username;
    }
}
