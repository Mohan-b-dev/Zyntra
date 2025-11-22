// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title ChatDApp v5.0 - Complete Group Chat & Status System
 * @notice Private + Group messaging with read receipts and delivery status
 * @dev Includes WhatsApp-like features: groups, status ticks, online presence
 */
contract ChatDAppV5 {
    // ========== PACKED STRUCTS ==========
    
    struct UserProfile {
        address userAddress;
        uint48 createdAt;
        uint48 lastSeen;
        bool isRegistered;
        bool isOnline;
        string username;
        string avatarUrl;
        string status;
    }
    
    struct PrivateMessage {
        address sender;
        uint48 timestamp;
        uint8 messageType; // 0=text, 1=image, 2=file
        uint8 status; // 0=sent, 1=delivered, 2=read
        bool isDeleted;
        string content;
        string txHash;
    }
    
    struct GroupInfo {
        bytes32 groupId;
        address creator;
        uint48 createdAt;
        uint32 memberCount;
        bool isActive;
        string name;
        string imageUrl;
        string description;
    }
    
    struct GroupMessage {
        address sender;
        uint48 timestamp;
        uint8 messageType;
        bool isDeleted;
        string content;
        string txHash;
    }
    
    struct GroupMember {
        address memberAddress;
        uint48 joinedAt;
        bool isAdmin;
        bool isMuted;
        uint48 lastReadTime; // For read receipts
    }
    
    struct MessageStatus {
        mapping(address => bool) delivered; // recipient => delivered
        mapping(address => bool) read; // recipient => read
        uint32 deliveredCount;
        uint32 readCount;
    }
    
    // ========== STATE VARIABLES ==========
    
    // Users
    mapping(address => UserProfile) private users;
    mapping(string => address) private usernameToAddress;
    address[] private registeredUsers;
    
    // Private chats
    mapping(bytes32 => PrivateMessage[]) private privateChats;
    mapping(bytes32 => mapping(uint256 => MessageStatus)) private privateMessageStatus;
    
    // Group chats
    mapping(bytes32 => GroupInfo) private groups;
    mapping(bytes32 => address[]) private groupMembers;
    mapping(bytes32 => GroupMessage[]) private groupChats;
    mapping(bytes32 => mapping(address => GroupMember)) private memberInfo;
    mapping(bytes32 => mapping(uint256 => mapping(address => bool))) private groupMessageReadStatus;
    mapping(address => bytes32[]) private userGroups;
    bytes32[] private allGroups;
    
    // Online status
    mapping(address => bool) private onlineUsers;
    
    // Rate limiting
    mapping(address => uint48) private lastMessageTime;
    uint48 private constant RATE_LIMIT = 1;
    
    // Constants
    uint8 private constant MIN_USERNAME_LENGTH = 3;
    uint8 private constant MAX_USERNAME_LENGTH = 20;
    uint8 private constant MIN_GROUP_NAME_LENGTH = 3;
    uint8 private constant MAX_GROUP_NAME_LENGTH = 50;
    uint16 private constant MAX_MESSAGE_LENGTH = 1000;
    uint8 private constant MAX_GROUP_MEMBERS = 256;
    
    // ========== EVENTS ==========
    
    event UserRegistered(address indexed user, string username, uint48 timestamp);
    event UserOnlineStatusChanged(address indexed user, bool isOnline);
    
    event PrivateMessageSent(
        bytes32 indexed chatId,
        address indexed sender,
        address indexed recipient,
        uint256 messageIndex,
        uint48 timestamp,
        string txHash
    );
    
    event MessageDelivered(
        bytes32 indexed chatId,
        uint256 messageIndex,
        address indexed recipient
    );
    
    event MessageRead(
        bytes32 indexed chatId,
        uint256 messageIndex,
        address indexed reader
    );
    
    event GroupCreated(
        bytes32 indexed groupId,
        address indexed creator,
        string name,
        uint48 timestamp
    );
    
    event GroupMessageSent(
        bytes32 indexed groupId,
        address indexed sender,
        uint256 messageIndex,
        uint48 timestamp,
        string txHash
    );
    
    event MemberAdded(bytes32 indexed groupId, address indexed member, address indexed addedBy);
    event MemberRemoved(bytes32 indexed groupId, address indexed member, address indexed removedBy);
    event MemberPromoted(bytes32 indexed groupId, address indexed member);
    event GroupMessageRead(bytes32 indexed groupId, uint256 messageIndex, address indexed reader);
    
    // ========== CUSTOM ERRORS ==========
    
    error UserAlreadyRegistered();
    error UserNotRegistered();
    error UsernameInvalid();
    error UsernameTaken();
    error MessageEmpty();
    error MessageTooLong();
    error RateLimitExceeded();
    error GroupNameInvalid();
    error GroupNotFound();
    error NotGroupMember();
    error NotGroupAdmin();
    error MaxMembersReached();
    error MemberAlreadyExists();
    error CannotRemoveSelf();
    
    // ========== MODIFIERS ==========
    
    modifier onlyRegistered() {
        if (!users[msg.sender].isRegistered) revert UserNotRegistered();
        _;
    }
    
    modifier onlyGroupMember(bytes32 _groupId) {
        if (!memberInfo[_groupId][msg.sender].memberAddress != address(0)) revert NotGroupMember();
        _;
    }
    
    modifier onlyGroupAdmin(bytes32 _groupId) {
        if (!memberInfo[_groupId][msg.sender].isAdmin) revert NotGroupAdmin();
        _;
    }
    
    // ========== USER FUNCTIONS ==========
    
    function registerUser(string calldata _username, string calldata _avatarUrl) external {
        if (users[msg.sender].isRegistered) revert UserAlreadyRegistered();
        
        bytes memory usernameBytes = bytes(_username);
        if (usernameBytes.length < MIN_USERNAME_LENGTH || usernameBytes.length > MAX_USERNAME_LENGTH) {
            revert UsernameInvalid();
        }
        
        if (usernameToAddress[_username] != address(0)) revert UsernameTaken();
        
        users[msg.sender] = UserProfile({
            userAddress: msg.sender,
            createdAt: uint48(block.timestamp),
            lastSeen: uint48(block.timestamp),
            isRegistered: true,
            isOnline: true,
            username: _username,
            avatarUrl: _avatarUrl,
            status: "Hey there! I'm using ChatDApp"
        });
        
        usernameToAddress[_username] = msg.sender;
        registeredUsers.push(msg.sender);
        onlineUsers[msg.sender] = true;
        
        emit UserRegistered(msg.sender, _username, uint48(block.timestamp));
        emit UserOnlineStatusChanged(msg.sender, true);
    }
    
    function setOnlineStatus(bool _isOnline) external onlyRegistered {
        users[msg.sender].isOnline = _isOnline;
        onlineUsers[msg.sender] = _isOnline;
        if (!_isOnline) {
            users[msg.sender].lastSeen = uint48(block.timestamp);
        }
        emit UserOnlineStatusChanged(msg.sender, _isOnline);
    }
    
    function updateProfile(
        string calldata _username,
        string calldata _avatarUrl,
        string calldata _status
    ) external onlyRegistered {
        if (bytes(_username).length > 0) {
            if (usernameToAddress[_username] != address(0) && usernameToAddress[_username] != msg.sender) {
                revert UsernameTaken();
            }
            delete usernameToAddress[users[msg.sender].username];
            users[msg.sender].username = _username;
            usernameToAddress[_username] = msg.sender;
        }
        
        if (bytes(_avatarUrl).length > 0) {
            users[msg.sender].avatarUrl = _avatarUrl;
        }
        
        if (bytes(_status).length > 0) {
            users[msg.sender].status = _status;
        }
    }
    
    // ========== PRIVATE MESSAGING ==========
    
    function sendPrivateMessage(
        address _recipient,
        string calldata _content,
        uint8 _messageType,
        string calldata _txHash
    ) external onlyRegistered returns (uint256) {
        if (bytes(_content).length == 0) revert MessageEmpty();
        if (bytes(_content).length > MAX_MESSAGE_LENGTH) revert MessageTooLong();
        
        bytes32 chatId = _getChatId(msg.sender, _recipient);
        
        PrivateMessage memory newMessage = PrivateMessage({
            sender: msg.sender,
            timestamp: uint48(block.timestamp),
            messageType: _messageType,
            status: 0, // sent
            isDeleted: false,
            content: _content,
            txHash: _txHash
        });
        
        privateChats[chatId].push(newMessage);
        uint256 messageIndex = privateChats[chatId].length - 1;
        
        emit PrivateMessageSent(chatId, msg.sender, _recipient, messageIndex, uint48(block.timestamp), _txHash);
        
        return messageIndex;
    }
    
    function markMessageDelivered(bytes32 _chatId, uint256 _messageIndex) external onlyRegistered {
        if (_messageIndex >= privateChats[_chatId].length) revert();
        
        PrivateMessage storage message = privateChats[_chatId][_messageIndex];
        if (message.status == 0) {
            message.status = 1; // delivered
        }
        
        privateMessageStatus[_chatId][_messageIndex].delivered[msg.sender] = true;
        privateMessageStatus[_chatId][_messageIndex].deliveredCount++;
        
        emit MessageDelivered(_chatId, _messageIndex, msg.sender);
    }
    
    function markMessageRead(bytes32 _chatId, uint256 _messageIndex) external onlyRegistered {
        if (_messageIndex >= privateChats[_chatId].length) revert();
        
        PrivateMessage storage message = privateChats[_chatId][_messageIndex];
        message.status = 2; // read
        
        privateMessageStatus[_chatId][_messageIndex].read[msg.sender] = true;
        privateMessageStatus[_chatId][_messageIndex].readCount++;
        
        emit MessageRead(_chatId, _messageIndex, msg.sender);
    }
    
    function getPrivateMessages(address _peer) external view onlyRegistered returns (PrivateMessage[] memory) {
        bytes32 chatId = _getChatId(msg.sender, _peer);
        return privateChats[chatId];
    }
    
    // ========== GROUP CHAT FUNCTIONS ==========
    
    function createGroup(
        string calldata _name,
        string calldata _imageUrl,
        string calldata _description
    ) external onlyRegistered returns (bytes32) {
        bytes memory nameBytes = bytes(_name);
        if (nameBytes.length < MIN_GROUP_NAME_LENGTH || nameBytes.length > MAX_GROUP_NAME_LENGTH) {
            revert GroupNameInvalid();
        }
        
        bytes32 groupId = keccak256(abi.encodePacked(msg.sender, _name, block.timestamp));
        
        groups[groupId] = GroupInfo({
            groupId: groupId,
            creator: msg.sender,
            createdAt: uint48(block.timestamp),
            memberCount: 1,
            isActive: true,
            name: _name,
            imageUrl: _imageUrl,
            description: _description
        });
        
        // Add creator as first member and admin
        groupMembers[groupId].push(msg.sender);
        memberInfo[groupId][msg.sender] = GroupMember({
            memberAddress: msg.sender,
            joinedAt: uint48(block.timestamp),
            isAdmin: true,
            isMuted: false,
            lastReadTime: uint48(block.timestamp)
        });
        
        userGroups[msg.sender].push(groupId);
        allGroups.push(groupId);
        
        emit GroupCreated(groupId, msg.sender, _name, uint48(block.timestamp));
        
        return groupId;
    }
    
    function addGroupMember(bytes32 _groupId, address _member) 
        external 
        onlyRegistered 
        onlyGroupAdmin(_groupId) 
    {
        if (!groups[_groupId].isActive) revert GroupNotFound();
        if (memberInfo[_groupId][_member].memberAddress != address(0)) revert MemberAlreadyExists();
        if (groups[_groupId].memberCount >= MAX_GROUP_MEMBERS) revert MaxMembersReached();
        
        groupMembers[_groupId].push(_member);
        memberInfo[_groupId][_member] = GroupMember({
            memberAddress: _member,
            joinedAt: uint48(block.timestamp),
            isAdmin: false,
            isMuted: false,
            lastReadTime: uint48(block.timestamp)
        });
        
        groups[_groupId].memberCount++;
        userGroups[_member].push(_groupId);
        
        emit MemberAdded(_groupId, _member, msg.sender);
    }
    
    function removeGroupMember(bytes32 _groupId, address _member)
        external
        onlyRegistered
        onlyGroupAdmin(_groupId)
    {
        if (_member == msg.sender) revert CannotRemoveSelf();
        if (memberInfo[_groupId][_member].memberAddress == address(0)) revert NotGroupMember();
        
        delete memberInfo[_groupId][_member];
        groups[_groupId].memberCount--;
        
        // Remove from userGroups array
        bytes32[] storage userGroupList = userGroups[_member];
        for (uint i = 0; i < userGroupList.length; i++) {
            if (userGroupList[i] == _groupId) {
                userGroupList[i] = userGroupList[userGroupList.length - 1];
                userGroupList.pop();
                break;
            }
        }
        
        emit MemberRemoved(_groupId, _member, msg.sender);
    }
    
    function promoteToAdmin(bytes32 _groupId, address _member)
        external
        onlyRegistered
        onlyGroupAdmin(_groupId)
    {
        if (memberInfo[_groupId][_member].memberAddress == address(0)) revert NotGroupMember();
        memberInfo[_groupId][_member].isAdmin = true;
        emit MemberPromoted(_groupId, _member);
    }
    
    function sendGroupMessage(
        bytes32 _groupId,
        string calldata _content,
        uint8 _messageType,
        string calldata _txHash
    ) external onlyRegistered onlyGroupMember(_groupId) returns (uint256) {
        if (bytes(_content).length == 0) revert MessageEmpty();
        if (bytes(_content).length > MAX_MESSAGE_LENGTH) revert MessageTooLong();
        
        GroupMessage memory newMessage = GroupMessage({
            sender: msg.sender,
            timestamp: uint48(block.timestamp),
            messageType: _messageType,
            isDeleted: false,
            content: _content,
            txHash: _txHash
        });
        
        groupChats[_groupId].push(newMessage);
        uint256 messageIndex = groupChats[_groupId].length - 1;
        
        emit GroupMessageSent(_groupId, msg.sender, messageIndex, uint48(block.timestamp), _txHash);
        
        return messageIndex;
    }
    
    function markGroupMessageRead(bytes32 _groupId, uint256 _messageIndex)
        external
        onlyRegistered
        onlyGroupMember(_groupId)
    {
        if (_messageIndex >= groupChats[_groupId].length) revert();
        
        groupMessageReadStatus[_groupId][_messageIndex][msg.sender] = true;
        memberInfo[_groupId][msg.sender].lastReadTime = uint48(block.timestamp);
        
        emit GroupMessageRead(_groupId, _messageIndex, msg.sender);
    }
    
    function getGroupMessages(bytes32 _groupId) 
        external 
        view 
        onlyRegistered 
        onlyGroupMember(_groupId) 
        returns (GroupMessage[] memory) 
    {
        return groupChats[_groupId];
    }
    
    function getGroupInfo(bytes32 _groupId) external view returns (GroupInfo memory) {
        return groups[_groupId];
    }
    
    function getGroupMembers(bytes32 _groupId) external view returns (address[] memory) {
        return groupMembers[_groupId];
    }
    
    function getUserGroups() external view onlyRegistered returns (bytes32[] memory) {
        return userGroups[msg.sender];
    }
    
    function isGroupAdmin(bytes32 _groupId, address _user) external view returns (bool) {
        return memberInfo[_groupId][_user].isAdmin;
    }
    
    function getGroupMessageReadCount(bytes32 _groupId, uint256 _messageIndex) 
        external 
        view 
        returns (uint256 count, uint256 totalMembers) 
    {
        totalMembers = groups[_groupId].memberCount;
        count = 0;
        
        address[] memory members = groupMembers[_groupId];
        for (uint i = 0; i < members.length; i++) {
            if (groupMessageReadStatus[_groupId][_messageIndex][members[i]]) {
                count++;
            }
        }
    }
    
    // ========== VIEW FUNCTIONS ==========
    
    function getUser(address _user) external view returns (UserProfile memory) {
        return users[_user];
    }
    
    function isUserOnline(address _user) external view returns (bool) {
        return onlineUsers[_user];
    }
    
    function getAllRegisteredUsers() external view returns (address[] memory) {
        return registeredUsers;
    }
    
    function _getChatId(address _addr1, address _addr2) private pure returns (bytes32) {
        return _addr1 < _addr2 
            ? keccak256(abi.encodePacked(_addr1, _addr2))
            : keccak256(abi.encodePacked(_addr2, _addr1));
    }
}
