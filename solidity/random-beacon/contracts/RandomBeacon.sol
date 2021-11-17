// SPDX-License-Identifier: MIT
//
// ▓▓▌ ▓▓ ▐▓▓ ▓▓▓▓▓▓▓▓▓▓▌▐▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▄
// ▓▓▓▓▓▓▓▓▓▓ ▓▓▓▓▓▓▓▓▓▓▌▐▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
//   ▓▓▓▓▓▓    ▓▓▓▓▓▓▓▀    ▐▓▓▓▓▓▓    ▐▓▓▓▓▓   ▓▓▓▓▓▓     ▓▓▓▓▓   ▐▓▓▓▓▓▌   ▐▓▓▓▓▓▓
//   ▓▓▓▓▓▓▄▄▓▓▓▓▓▓▓▀      ▐▓▓▓▓▓▓▄▄▄▄         ▓▓▓▓▓▓▄▄▄▄         ▐▓▓▓▓▓▌   ▐▓▓▓▓▓▓
//   ▓▓▓▓▓▓▓▓▓▓▓▓▓▀        ▐▓▓▓▓▓▓▓▓▓▓         ▓▓▓▓▓▓▓▓▓▓         ▐▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
//   ▓▓▓▓▓▓▀▀▓▓▓▓▓▓▄       ▐▓▓▓▓▓▓▀▀▀▀         ▓▓▓▓▓▓▀▀▀▀         ▐▓▓▓▓▓▓▓▓▓▓▓▓▓▓▀
//   ▓▓▓▓▓▓   ▀▓▓▓▓▓▓▄     ▐▓▓▓▓▓▓     ▓▓▓▓▓   ▓▓▓▓▓▓     ▓▓▓▓▓   ▐▓▓▓▓▓▌
// ▓▓▓▓▓▓▓▓▓▓ █▓▓▓▓▓▓▓▓▓ ▐▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓  ▓▓▓▓▓▓▓▓▓▓
// ▓▓▓▓▓▓▓▓▓▓ ▓▓▓▓▓▓▓▓▓▓ ▐▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓  ▓▓▓▓▓▓▓▓▓▓
//
//                           Trust math, not hardware.

pragma solidity ^0.8.6;

import "./libraries/Groups.sol";
import "./libraries/Relay.sol";
import "./libraries/DKG.sol";
import "./libraries/Groups.sol";
import "./libraries/Callback.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title Sortition Pool contract interface
/// @notice This is an interface with just a few function signatures of the
///         Sortition Pool contract, which is available at
///         https://github.com/keep-network/sortition-pools/blob/main/contracts/SortitionPool.sol
///
/// TODO: Add a dependency to `keep-network/sortition-pools` and use sortition
///       pool interface from there.
interface ISortitionPool {
    function joinPool(address operator) external;

    function removeOperators(uint32[] calldata ids) external;

    function isOperatorInPool(address operator) external view returns (bool);

    function isOperatorEligible(address operator) external view returns (bool);

    function getIDOperator(uint32 id) external view returns (address);

    function getIDOperators(uint32[] calldata ids)
        external
        view
        returns (address[] memory);
}

/// @title Staking contract interface
/// @notice This is an interface with just a few function signatures of the
///         Staking contract, which is available at
///         https://github.com/threshold-network/solidity-contracts/blob/main/contracts/staking/IStaking.sol
///
/// TODO: Add a dependency to `threshold-network/solidity-contracts` and use
///       staking interface from there.
interface IRandomBeaconStaking {
    function slash(uint256 amount, address[] memory operators) external;
}

/// @title Keep Random Beacon
/// @notice Keep Random Beacon contract. It lets anyone request a new
///         relay entry and validates the new relay entry provided by the
///         network. This contract is in charge of all Random Beacon maintenance
///         activities such as group lifecycle or slashing.
/// @dev Should be owned by the governance contract controlling Random Beacon
///      parameters.
contract RandomBeacon is Ownable {
    using DKG for DKG.Data;
    using Groups for Groups.Data;
    using Relay for Relay.Data;
    using Callback for Callback.Data;

    // Constant parameters

    /// @notice Seed value used for the genesis group selection.
    /// https://www.wolframalpha.com/input/?i=pi+to+78+digits
    uint256 public constant genesisSeed =
        31415926535897932384626433832795028841971693993751058209749445923078164062862;

    // Governable parameters

    /// @notice Relay entry callback gas limit. This is the gas limit with which
    ///         callback function provided in the relay request transaction is
    ///         executed. The callback is executed with a new relay entry value
    ///         in the same transaction the relay entry is submitted.
    uint256 public callbackGasLimit;

    /// @notice The frequency of new group creation. Groups are created with
    ///         a fixed frequency of relay requests.
    uint256 public groupCreationFrequency;

    /// @notice Reward in T for submitting DKG result. The reward is paid to
    ///         a submitter of a valid DKG result when the DKG result challenge
    ///         period ends.
    uint256 public dkgResultSubmissionReward;

    /// @notice Reward in T for unlocking the sortition pool if DKG timed out.
    ///         When DKG result submission timed out, sortition pool is still
    ///         locked and someone needs to unlock it. Anyone can do it and earn
    ///         `sortitionPoolUnlockingReward`.
    uint256 public sortitionPoolUnlockingReward;

    /// @notice Slashing amount for supporting malicious DKG result. Every
    ///         DKG result submitted can be challenged for the time of
    ///         `dkgResultChallengePeriodLength`. If the DKG result submitted
    ///         is challenged and proven to be malicious, each operator who
    ///         signed the malicious result is slashed for
    ///         `maliciousDkgResultSlashingAmount`.
    uint256 public maliciousDkgResultSlashingAmount;

    ISortitionPool public sortitionPool;
    IRandomBeaconStaking public staking;

    // Libraries data storages
    DKG.Data internal dkg;
    Groups.Data internal groups;
    Relay.Data internal relay;
    Callback.Data internal callback;

    event RelayEntryParametersUpdated(
        uint256 relayRequestFee,
        uint256 relayEntrySubmissionEligibilityDelay,
        uint256 relayEntryHardTimeout,
        uint256 callbackGasLimit
    );

    event DkgParametersUpdated(
        uint256 dkgResultChallengePeriodLength,
        uint256 dkgResultSubmissionEligibilityDelay
    );

    event GroupCreationParametersUpdated(
        uint256 groupCreationFrequency,
        uint256 groupLifetime
    );

    event RewardParametersUpdated(
        uint256 dkgResultSubmissionReward,
        uint256 sortitionPoolUnlockingReward
    );

    event SlashingParametersUpdated(
        uint256 relayEntrySubmissionFailureSlashingAmount,
        uint256 maliciousDkgResultSlashingAmount
    );

    // Events copied from library to workaround issue https://github.com/ethereum/solidity/issues/9765

    event DkgStarted(uint256 indexed seed);

    event DkgResultSubmitted(
        bytes32 indexed resultHash,
        bytes indexed groupPubKey,
        address indexed submitter
    );

    event DkgTimedOut();

    event DkgResultApproved(
        bytes32 indexed resultHash,
        address indexed approver
    );

    event DkgResultChallenged(
        bytes32 indexed resultHash,
        address indexed challenger
    );

    event CandidateGroupRegistered(bytes indexed groupPubKey);

    event CandidateGroupRemoved(bytes indexed groupPubKey);

    event GroupActivated(uint64 indexed groupId, bytes indexed groupPubKey);

    event RelayEntryRequested(
        uint256 indexed requestId,
        uint64 groupId,
        bytes previousEntry
    );

    event RelayEntrySubmitted(uint256 indexed requestId, bytes entry);

    event RelayEntryTimedOut(uint256 indexed requestId);

    event CallbackFailed(uint256 entry, uint256 entrySubmittedBlock);

    /// @dev Assigns initial values to parameters to make the beacon work
    ///      safely. These parameters are just proposed defaults and they might
    ///      be updated with `update*` functions after the contract deployment
    ///      and before transferring the ownership to the governance contract.
    constructor(
        ISortitionPool _sortitionPool,
        IERC20 _tToken,
        IRandomBeaconStaking _staking
    ) {
        sortitionPool = _sortitionPool;
        staking = _staking;

        // Governable parameters
        callbackGasLimit = 200e3;
        groupCreationFrequency = 10;

        dkgResultSubmissionReward = 0;
        sortitionPoolUnlockingReward = 0;
        maliciousDkgResultSlashingAmount = 50000e18;

        dkg.initSortitionPool(_sortitionPool);
        dkg.setResultChallengePeriodLength(1440); // ~6h assuming 15s block time
        dkg.setResultSubmissionEligibilityDelay(10);

        relay.initSeedEntry();
        relay.initSortitionPool(_sortitionPool);
        relay.initTToken(_tToken);
        relay.initStaking(_staking);
        relay.setRelayEntrySubmissionEligibilityDelay(10);
        relay.setRelayEntryHardTimeout(5760); // ~24h assuming 15s block time
        relay.setRelayEntrySubmissionFailureSlashingAmount(1000e18);

        groups.setRelayEntryTimeout(relay.relayEntryTimeout());
    }

    /// @notice Updates the values of relay entry parameters.
    /// @dev Can be called only by the contract owner, which should be the
    ///      random beacon governance contract. The caller is responsible for
    ///      validating parameters.
    /// @param _relayRequestFee New relay request fee
    /// @param _relayEntrySubmissionEligibilityDelay New relay entry submission
    ///        eligibility delay
    /// @param _relayEntryHardTimeout New relay entry hard timeout
    /// @param _callbackGasLimit New callback gas limit
    function updateRelayEntryParameters(
        uint256 _relayRequestFee,
        uint256 _relayEntrySubmissionEligibilityDelay,
        uint256 _relayEntryHardTimeout,
        uint256 _callbackGasLimit
    ) external onlyOwner {
        callbackGasLimit = _callbackGasLimit;

        relay.setRelayRequestFee(_relayRequestFee);
        relay.setRelayEntrySubmissionEligibilityDelay(
            _relayEntrySubmissionEligibilityDelay
        );
        relay.setRelayEntryHardTimeout(_relayEntryHardTimeout);

        // as part of the update, a relay entry timeout needs to be updated
        // in the Groups lib.
        groups.setRelayEntryTimeout(relay.relayEntryTimeout());

        emit RelayEntryParametersUpdated(
            _relayRequestFee,
            _relayEntrySubmissionEligibilityDelay,
            _relayEntryHardTimeout,
            callbackGasLimit
        );
    }

    /// @notice Updates the values of group creation parameters.
    /// @dev Can be called only by the contract owner, which should be the
    ///      random beacon governance contract. The caller is responsible for
    ///      validating parameters.
    /// @param _groupCreationFrequency New group creation frequency
    /// @param _groupLifetime New group lifetime in blocks
    function updateGroupCreationParameters(
        uint256 _groupCreationFrequency,
        uint256 _groupLifetime
    ) external onlyOwner {
        groupCreationFrequency = _groupCreationFrequency;

        groups.setGroupLifetime(_groupLifetime);

        emit GroupCreationParametersUpdated(
            groupCreationFrequency,
            _groupLifetime
        );
    }

    /// @notice Updates the values of DKG parameters.
    /// @dev Can be called only by the contract owner, which should be the
    ///      random beacon governance contract. The caller is responsible for
    ///      validating parameters.
    /// @param _dkgResultChallengePeriodLength New DKG result challenge period
    ///        length
    /// @param _dkgResultSubmissionEligibilityDelay New DKG result submission
    ///        eligibility delay
    function updateDkgParameters(
        uint256 _dkgResultChallengePeriodLength,
        uint256 _dkgResultSubmissionEligibilityDelay
    ) external onlyOwner {
        dkg.setResultChallengePeriodLength(_dkgResultChallengePeriodLength);
        dkg.setResultSubmissionEligibilityDelay(
            _dkgResultSubmissionEligibilityDelay
        );

        emit DkgParametersUpdated(
            dkgResultChallengePeriodLength(),
            dkgResultSubmissionEligibilityDelay()
        );
    }

    /// @notice Updates the values of reward parameters.
    /// @dev Can be called only by the contract owner, which should be the
    ///      random beacon governance contract. The caller is responsible for
    ///      validating parameters.
    /// @param _dkgResultSubmissionReward New DKG result submission reward
    /// @param _sortitionPoolUnlockingReward New sortition pool unlocking reward
    function updateRewardParameters(
        uint256 _dkgResultSubmissionReward,
        uint256 _sortitionPoolUnlockingReward
    ) external onlyOwner {
        dkgResultSubmissionReward = _dkgResultSubmissionReward;
        sortitionPoolUnlockingReward = _sortitionPoolUnlockingReward;
        emit RewardParametersUpdated(
            dkgResultSubmissionReward,
            sortitionPoolUnlockingReward
        );
    }

    /// @notice The number of blocks for which a DKG result can be challenged.
    ///         Anyone can challenge DKG result for a certain number of blocks
    ///         before the result is fully accepted and the group registered in
    ///         the pool of active groups. If the challenge gets accepted, all
    ///         operators who signed the malicious result get slashed for
    ///         `maliciousDkgResultSlashingAmount` and the notifier gets
    ///         rewarded.
    function dkgResultChallengePeriodLength() public view returns (uint256) {
        return dkg.parameters.resultChallengePeriodLength;
    }

    /// @notice The number of blocks it takes for a group member to become
    ///         eligible to submit the DKG result. At first, there is only one
    ///         member in the group eligible to submit the DKG result. Then,
    ///         after `dkgResultSubmissionEligibilityDelay` blocks, another
    ///         group member becomes eligible so that there are two group
    ///         members eligible to submit the DKG result at that moment. After
    ///         another `dkgResultSubmissionEligibilityDelay` blocks, yet one
    ///         group member becomes eligible to submit the DKG result so that
    ///         there are three group members eligible to submit the DKG result
    ///         at that moment. This continues until all group members are
    ///         eligible to submit the DKG result or until the DKG result is
    ///         submitted. If all members became eligible to submit the DKG
    ///         result and one more `dkgResultSubmissionEligibilityDelay` passed
    ///         without the DKG result submitted, DKG is considered as timed out
    ///         and no DKG result for this group creation can be submitted
    ///         anymore.
    function dkgResultSubmissionEligibilityDelay()
        public
        view
        returns (uint256)
    {
        return dkg.parameters.resultSubmissionEligibilityDelay;
    }

    /// @notice Updates the values of slashing parameters.
    /// @dev Can be called only by the contract owner, which should be the
    ///      random beacon governance contract. The caller is responsible for
    ///      validating parameters.
    /// @param _relayEntrySubmissionFailureSlashingAmount New relay entry
    ///        submission failure amount
    /// @param _maliciousDkgResultSlashingAmount New malicious DKG result
    ///        slashing amount
    function updateSlashingParameters(
        uint256 _relayEntrySubmissionFailureSlashingAmount,
        uint256 _maliciousDkgResultSlashingAmount
    ) external onlyOwner {
        relay.setRelayEntrySubmissionFailureSlashingAmount(
            _relayEntrySubmissionFailureSlashingAmount
        );
        maliciousDkgResultSlashingAmount = _maliciousDkgResultSlashingAmount;
        emit SlashingParametersUpdated(
            _relayEntrySubmissionFailureSlashingAmount,
            maliciousDkgResultSlashingAmount
        );
    }

    /// @notice Registers caller in the sortition pool.
    function registerMemberCandidate() external {
        address operator = msg.sender;
        require(
            !sortitionPool.isOperatorInPool(operator),
            "Operator is already registered"
        );
        sortitionPool.joinPool(operator);
    }

    /// @notice Checks whether the given operator is eligible to join the
    ///         sortition pool.
    /// @param operator Address of the operator
    function isOperatorEligible(address operator) external view returns (bool) {
        return sortitionPool.isOperatorEligible(operator);
    }

    /// @notice Triggers group selection if there are no active groups.
    function genesis() external {
        require(groups.numberOfActiveGroups() == 0, "not awaiting genesis");

        createGroup(
            uint256(keccak256(abi.encodePacked(genesisSeed, block.number)))
        );
    }

    /// @notice Creates a new group.
    /// @param seed Seed for DKG.
    function createGroup(uint256 seed) internal {
        // TODO: Lock sortition pool.

        dkg.start(seed);
    }

    /// @notice Submits result of DKG protocol. It is on-chain part of phase 14 of
    ///         the protocol. The DKG result consists of result submitting member
    ///         index, calculated group public key, bytes array of misbehaved
    ///         members, concatenation of signatures from group members,
    ///         indices of members corresponding to each signature and
    ///         the list of group members.
    ///         When the result is verified successfully it gets registered and
    ///         waits for an approval. A result can be challenged to verify the
    ///         members list corresponds to the expected set of members determined
    ///         by the sortition pool.
    ///         A candidate group is registered based on the submitted DKG result
    ///         details.
    /// @dev The message to be signed by each member is keccak256 hash of the
    ///      calculated group public key, misbehaved members as bytes and DKG
    ///      start block. The calculated hash should be prefixed with prefixed with
    ///      `\x19Ethereum signed message:\n` before signing, so the message to
    ///      sign is:
    ///      `\x19Ethereum signed message:\n${keccak256(groupPubKey,misbehaved,startBlock)}`
    /// @param dkgResult DKG result.
    function submitDkgResult(DKG.Result calldata dkgResult) external {
        dkg.submitResult(dkgResult);

        groups.addCandidateGroup(
            dkgResult.groupPubKey,
            dkgResult.members,
            dkgResult.misbehavedMembersIndices
        );
    }

    /// @notice Notifies about DKG timeout.
    function notifyDkgTimeout() external {
        dkg.notifyTimeout();

        // TODO: Pay a reward to the caller.
    }

    /// @notice Approves DKG result. Can be called after challenge period for the
    ///         submitted result is finished. Considers the submitted result as
    ///         valid and completes the group creation by activating the candidate
    ///         group.
    function approveDkgResult() external {
        dkg.approveResult();

        groups.activateCandidateGroup();

        // TODO: Handle DQ/IA
        // TODO: Release a rewards to DKG submitter.
        // TODO: Unlock sortition pool
    }

    /// @notice Challenges DKG result. If the submitted result is proved to be
    ///         invalid it reverts the DKG back to the result submission phase.
    ///         It removes a candidate group that was previously registered with
    ///         the DKG result submission.
    function challengeDkgResult() external {
        // TODO: Determine parameters required for DKG result challenges.
        dkg.challengeResult();

        groups.popCandidateGroup();

        // TODO: Implement slashing
    }

    /// @notice Check current group creation state.
    function getGroupCreationState() external view returns (DKG.State) {
        return dkg.currentState();
    }

    /// @notice Checks if DKG timed out. The DKG timeout period includes time required
    ///         for off-chain protocol execution and time for the result publication
    ///         for all group members. After this time result cannot be submitted
    ///         and DKG can be notified about the timeout.
    /// @return True if DKG timed out, false otherwise.
    function hasDkgTimedOut() external view returns (bool) {
        return dkg.hasDkgTimedOut();
    }

    function getGroupsRegistry() external view returns (bytes32[] memory) {
        return groups.groupsRegistry;
    }

    function getGroup(uint64 groupId)
        external
        view
        returns (Groups.Group memory)
    {
        return groups.getGroup(groupId);
    }

    function getGroup(bytes memory groupPubKey)
        external
        view
        returns (Groups.Group memory)
    {
        return groups.getGroup(groupPubKey);
    }

    /// @notice Creates a request to generate a new relay entry, which will
    ///         include a random number (by signing the previous entry's
    ///         random number). Requires a request fee denominated in T token.
    /// @param callbackContract Beacon consumer callback contract.
    function requestRelayEntry(IRandomBeaconConsumer callbackContract)
        external
    {
        uint64 groupId = groups.selectGroup(
            uint256(keccak256(relay.previousEntry))
        );

        relay.requestEntry(groupId);

        callback.setCallbackContract(callbackContract);
    }

    /// @notice Creates a new relay entry.
    /// @param submitterIndex Index of the entry submitter.
    /// @param entry Group BLS signature over the previous entry.
    function submitRelayEntry(uint256 submitterIndex, bytes calldata entry)
        external
    {
        relay.submitEntry(
            submitterIndex,
            entry,
            groups.getGroup(relay.currentRequest.groupId)
        );

        if (relay.requestCount % groupCreationFrequency == 0) {
            // TODO: Once implemented, invoke:
            // createGroup(uint256(keccak256(entry)));
        }

        callback.executeCallback(uint256(keccak256(entry)), callbackGasLimit);
    }

    /// @notice Reports a relay entry timeout.
    function reportRelayEntryTimeout() external {
        uint64 groupId = relay.currentRequest.groupId;
        address[] memory groupMembers = sortitionPool.getIDOperators(
            groups.getGroup(groupId).members
        );

        staking.slash(
            relay.relayEntrySubmissionFailureSlashingAmount,
            groupMembers
        );

        groups.terminateGroup(groupId);

        if (groups.numberOfActiveGroups() > 0) {
            groupId = groups.selectGroup(
                uint256(keccak256(relay.previousEntry))
            );
            relay.retryOnEntryTimeout(groupId);
        } else {
            relay.cleanupOnEntryTimeout();
        }
    }

    /// @return Flag indicating whether a relay entry request is currently
    ///         in progress.
    function isRelayRequestInProgress() external view returns (bool) {
        return relay.isRequestInProgress();
    }

    /// @return Relay request fee in T. This fee needs to be provided by the
    ///         account or contract requesting for a new relay entry.
    function relayRequestFee() external view returns (uint256) {
        return relay.relayRequestFee;
    }

    /// @return The number of blocks it takes for a group member to become
    ///         eligible to submit the relay entry. At first, there is only one
    ///         member in the group eligible to submit the relay entry. Then,
    ///         after `relayEntrySubmissionEligibilityDelay` blocks, another
    ///         group member becomes eligible so that there are two group
    ///         members eligible to submit the relay entry at that moment. After
    ///         another `relayEntrySubmissionEligibilityDelay` blocks, yet one
    ///         group member becomes eligible so that there are three group
    ///         members eligible to submit the relay entry at that moment. This
    ///         continues until all group members are eligible to submit the
    ///         relay entry or until the relay entry is submitted. If all
    ///         members became eligible to submit the relay entry and one more
    ///         `relayEntrySubmissionEligibilityDelay` passed without the relay
    ///         entry submitted, the group reaches soft timeout for submitting
    ///         the relay entry and the slashing starts.
    function relayEntrySubmissionEligibilityDelay()
        external
        view
        returns (uint256)
    {
        return relay.relayEntrySubmissionEligibilityDelay;
    }

    /// @return Hard timeout in blocks for a group to submit the relay entry.
    ///         After all group members became eligible to submit the relay
    ///         entry and one more `relayEntrySubmissionEligibilityDelay` blocks
    ///         passed without relay entry submitted, all group members start
    ///         getting slashed. The slashing amount increases linearly until
    ///         the group submits the relay entry or until
    ///         `relayEntryHardTimeout` is reached. When the hard timeout is
    ///         reached, each group member will get slashed for
    ///         `relayEntrySubmissionFailureSlashingAmount`.
    function relayEntryHardTimeout() external view returns (uint256) {
        return relay.relayEntryHardTimeout;
    }

    /// @notice Slashing amount for not submitting relay entry. When
    ///         relay entry hard timeout is reached without the relay entry
    ///         submitted, each group member gets slashed for
    ///         `relayEntrySubmissionFailureSlashingAmount`. If the relay entry
    ///         gets submitted after the soft timeout (see
    ///         `relayEntrySubmissionEligibilityDelay` documentation), but
    ///         before the hard timeout, each group member gets slashed
    ///         proportionally to `relayEntrySubmissionFailureSlashingAmount`
    ///         and the time passed since the soft deadline.
    function relayEntrySubmissionFailureSlashingAmount()
        external
        view
        returns (uint256)
    {
        return relay.relayEntrySubmissionFailureSlashingAmount;
    }

    /// @notice Group lifetime in blocks. When a group reached its lifetime, it
    ///         is no longer selected for new relay requests but may still be
    ///         responsible for submitting relay entry if relay request assigned
    ///         to that group is still pending.
    function groupLifetime() external view returns (uint256) {
        return groups.groupLifetime;
    }
}
