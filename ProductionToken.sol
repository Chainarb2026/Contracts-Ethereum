// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";

/// @title ProductionToken
/// @notice ERC20 with fixed supply cap, burn, and EIP-2612 permit
contract ProductionToken is ERC20, ERC20Burnable, ERC20Permit, Ownable2Step {

    error ZeroAddress();
    error ZeroAmount();
    error ExceedsMaxSupply(uint256 requested, uint256 remaining);

    event TokensMinted(address indexed to, uint256 amount, uint256 newTotalSupply);
    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);

    uint256 public constant MAX_SUPPLY     = 1_000_000_000 * 10 ** 18;
    uint256 public constant INITIAL_SUPPLY =   400_000_000 * 10 ** 18;
    address public treasury;

    constructor(
        string memory _name, string memory _symbol,
        address _owner, address _treasury
    ) ERC20(_name, _symbol) ERC20Permit(_name) Ownable(_owner) {
        if (_owner    == address(0)) revert ZeroAddress();
        if (_treasury == address(0)) revert ZeroAddress();
        treasury = _treasury;
        _mint(_owner, INITIAL_SUPPLY);
        emit TreasuryUpdated(address(0), _treasury);
    }

    function mint(address to, uint256 amount) external onlyOwner {
        if (to == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        uint256 rem = MAX_SUPPLY - totalSupply();
        if (amount > rem) revert ExceedsMaxSupply(amount, rem);
        _mint(to, amount);
        emit TokensMinted(to, amount, totalSupply());
    }

    function setTreasury(address newTreasury) external onlyOwner {
        if (newTreasury == address(0)) revert ZeroAddress();
        address old = treasury;
        treasury = newTreasury;
        emit TreasuryUpdated(old, newTreasury);
    }

    function remainingMintable() external view returns (uint256) { return MAX_SUPPLY - totalSupply(); }
    function isMaxSupplyReached() external view returns (bool) { return totalSupply() == MAX_SUPPLY; }

    function _update(address from, address to, uint256 value) internal override(ERC20) {
        super._update(from, to, value);
    }
}
