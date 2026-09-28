// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";

/// @title ProductionToken
/// @author ChainArb Engineering Team
/// @notice Production-grade ERC-20 utility token featuring fixed supply ceiling, burning capabilities, and EIP-2612 permit approvals.
/// @dev Inherits OpenZeppelin v5.0 ERC20, ERC20Burnable, ERC20Permit, and Ownable2Step.
contract ProductionToken is ERC20, ERC20Burnable, ERC20Permit, Ownable2Step {

    /// @notice Thrown when an input address is the zero address (0x0).
    error ZeroAddress();

    /// @notice Thrown when attempting an operation with a zero token amount.
    error ZeroAmount();

    /// @notice Thrown when a mint operation exceeds the hard maximum supply ceiling.
    /// @param requested The number of tokens requested to mint.
    /// @param remaining The remaining number of tokens that can still be minted before reaching MAX_SUPPLY.
    error ExceedsMaxSupply(uint256 requested, uint256 remaining);

    /// @notice Emitted whenever new tokens are minted.
    /// @param to The recipient address receiving the newly minted tokens.
    /// @param amount The quantity of tokens minted (18 decimals).
    /// @param newTotalSupply The updated total circulating token supply after minting.
    event TokensMinted(address indexed to, uint256 amount, uint256 newTotalSupply);

    /// @notice Emitted when the designated project treasury wallet address is updated.
    /// @param oldTreasury The previous treasury wallet address.
    /// @param newTreasury The newly designated treasury wallet address.
    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);

    /// @notice The absolute maximum supply cap (1,000,000,000 tokens with 18 decimals).
    uint256 public constant MAX_SUPPLY = 1_000_000_000 * 10 ** 18;

    /// @notice The initial token supply minted upon deployment (400,000,000 tokens with 18 decimals).
    uint256 public constant INITIAL_SUPPLY = 400_000_000 * 10 ** 18;

    /// @notice The designated treasury wallet address for reserve and fee allocation.
    address public treasury;

    /// @notice Initializes the token name, symbol, initial supply distribution, and governance parameters.
    /// @dev Validates that neither `_owner` nor `_treasury` is address(0). Passes initial owner to Ownable.
    /// @param _name The human-readable name of the token (e.g. "ChainArb Utility Token").
    /// @param _symbol The ticker symbol of the token (e.g. "CARB").
    /// @param _owner The initial owner address with administrative minting authority.
    /// @param _treasury The designated treasury address for project funds.
    constructor(
        string memory _name,
        string memory _symbol,
        address _owner,
        address _treasury
    ) ERC20(_name, _symbol) ERC20Permit(_name) Ownable(_owner) {
        if (_owner == address(0)) revert ZeroAddress();
        if (_treasury == address(0)) revert ZeroAddress();

        treasury = _treasury;
        _mint(_owner, INITIAL_SUPPLY);
        emit TreasuryUpdated(address(0), _treasury);
    }

    /// @notice Mints new tokens up to the MAX_SUPPLY ceiling.
    /// @dev Restricted to the contract owner. Validates recipient and remaining mint capacity.
    /// @param to The recipient address for the minted tokens.
    /// @param amount The number of tokens to mint (with 18 decimals).
    function mint(address to, uint256 amount) external onlyOwner {
        if (to == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();

        uint256 rem = MAX_SUPPLY - totalSupply();
        if (amount > rem) revert ExceedsMaxSupply(amount, rem);

        _mint(to, amount);
        emit TokensMinted(to, amount, totalSupply());
    }

    /// @notice Updates the designated treasury wallet address.
    /// @dev Restricted to the contract owner.
    /// @param newTreasury The address of the new treasury.
    function setTreasury(address newTreasury) external onlyOwner {
        if (newTreasury == address(0)) revert ZeroAddress();
        address old = treasury;
        treasury = newTreasury;
        emit TreasuryUpdated(old, newTreasury);
    }

    /// @notice Calculates the number of tokens that can still be minted before reaching MAX_SUPPLY.
    /// @return The remaining mintable supply in wei (18 decimals).
    function remainingMintable() external view returns (uint256) {
        return MAX_SUPPLY - totalSupply();
    }

    /// @notice Checks if the token's total supply has reached the maximum allowed supply.
    /// @return True if totalSupply == MAX_SUPPLY, false otherwise.
    function isMaxSupplyReached() external view returns (bool) {
        return totalSupply() == MAX_SUPPLY;
    }

    /// @dev Internal hook required by OpenZeppelin v5 to handle mints, transfers, and burns.
    /// @param from The sender address.
    /// @param to The recipient address.
    /// @param value The amount of tokens transferred.
    function _update(address from, address to, uint256 value) internal override(ERC20) {
        super._update(from, to, value);
    }
}
