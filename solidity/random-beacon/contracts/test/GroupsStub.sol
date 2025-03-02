// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

import "../libraries/Groups.sol";

contract GroupsStub {
    using Groups for Groups.Data;

    Groups.Data internal groups;

    event CandidateGroupRegistered(bytes indexed groupPubKey);

    event CandidateGroupRemoved(bytes indexed groupPubKey);

    event GroupActivated(uint64 indexed groupId, bytes indexed groupPubKey);

    function addCandidateGroup(bytes calldata groupPubKey, bytes32 membersHash)
        external
    {
        groups.addCandidateGroup(groupPubKey, membersHash);
    }

    function popCandidateGroup() external {
        groups.popCandidateGroup();
    }

    function activateCandidateGroup() external {
        groups.activateCandidateGroup();
    }

    function terminateGroup(uint64 groupId) external {
        groups.terminateGroup(groupId);
    }

    function selectGroup(uint256 seed) external returns (uint64) {
        return groups.selectGroup(seed);
    }

    function setGroupLifetime(uint256 groupLifetime) external {
        groups.setGroupLifetime(groupLifetime);
    }

    function getGroupsRegistry() external view returns (bytes32[] memory) {
        return groups.groupsRegistry;
    }

    function numberOfActiveGroups() external view returns (uint64) {
        return groups.numberOfActiveGroups();
    }

    function getGroup(bytes memory groupPubKey)
        external
        view
        returns (Groups.Group memory)
    {
        return groups.getGroup(groupPubKey);
    }

    // group id is an index in the groups.groupsRegistry array
    function getGroupById(uint64 groupId)
        external
        view
        returns (Groups.Group memory)
    {
        return groups.getGroup(groupId);
    }

    function activeTerminatedGroups() public view returns (uint64[] memory) {
        return groups.activeTerminatedGroups;
    }

    function expireOldGroups() public {
        groups.expireOldGroups();
    }

    function expiredGroupOffset() public view returns (uint256) {
        return groups.expiredGroupOffset;
    }
}
