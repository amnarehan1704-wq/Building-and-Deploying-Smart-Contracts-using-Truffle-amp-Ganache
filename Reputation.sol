// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title Reputation (bonus 2nd contract)
/// @notice Keeps "helper points" for students who return items.
///         Only the CampusLostFound contract is allowed to add points.
contract Reputation {
    address public owner;
    address public lostFound;                 // the only contract allowed to award points
    mapping(address => uint256) public points;

    event PointAwarded(address indexed student, uint256 totalPoints);

    constructor() {
        owner = msg.sender;
    }

    /// @notice one-time link to the CampusLostFound contract (called from migration)
    function setLostFound(address _lostFound) external {
        require(msg.sender == owner, "Only owner");
        require(lostFound == address(0), "Already set");
        lostFound = _lostFound;
    }

    function addPoint(address _student) external {
        require(msg.sender == lostFound, "Only CampusLostFound");
        points[_student] += 1;
        emit PointAwarded(_student, points[_student]);
    }

    function getPoints(address _student) external view returns (uint256) {
        return points[_student];
    }
}
