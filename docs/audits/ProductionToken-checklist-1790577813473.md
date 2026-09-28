# Pre-Deploy Security Checklist — ProductionToken
Date: 2026-09-28
Contract: contracts/tokens/ProductionToken.sol

## Automated Checks
- [x] [A01] Pragma version locked (HIGH)
- [x] [A02] SPDX license identifier (LOW)
- [x] [A03] No tx.origin usage (CRITICAL)
- [x] [A04] No suicide/selfdestruct (HIGH)
- [x] [A05] SafeERC20 used for token transfers (MEDIUM)
- [x] [A06] No hardcoded addresses (HIGH)
- [x] [A07] Custom errors used (not require strings) (LOW)
- [x] [A08] Events declared (MEDIUM)
- [x] [A09] No floating pragma (MEDIUM)
- [x] [A10] Constructor validates zero addresses (HIGH)

## Manual Checks (complete before deploying)
- [ ] [M01] CEI pattern followed in all state-changing functions (CRITICAL)
  Every function that changes state: CHECKS first, EFFECTS (state changes) second, INTERACTIONS (external calls) last
- [ ] [M02] ReentrancyGuard on ETH-sending functions (CRITICAL)
  Any function that sends ETH or calls external contracts must have nonReentrant modifier
- [ ] [M03] Access control on all sensitive functions (HIGH)
  Every function that changes critical state has onlyOwner, onlyRole, or equivalent
- [ ] [M04] Integer math verified for precision (HIGH)
  Division always happens AFTER multiplication. No precision loss in reward math.
- [ ] [M05] External call return values checked (HIGH)
  All .call() return values checked. All IERC20 calls use SafeERC20.
- [ ] [M06] State zeroed before ETH transfer (CRITICAL)
  Balance/amount set to 0 BEFORE the .call{value:}() line, not after
- [ ] [M07] No oracle price manipulation vector (HIGH)
  If using price feeds: TWAP used (not spot price). Flash loan can't manipulate.
- [ ] [M08] Ownership transfer safe (MEDIUM)
  Using Ownable2Step (not Ownable). Ownership transfer requires acceptance.
- [ ] [M09] Max supply enforced correctly (HIGH)
  If token has cap: MAX_SUPPLY is constant. Check is before _mint. Overflow impossible.
- [ ] [M10] Tests cover all revert conditions (MEDIUM)
  Every custom error has a test that triggers it. Every modifier has a test that checks it.

## Sign-off
- [ ] All automated checks pass
- [ ] All manual checks verified  
- [ ] Tests passing: `npx hardhat test`
- [ ] Coverage acceptable: `npx hardhat coverage`
- [ ] Deployed to testnet first
- [ ] Testnet version tested thoroughly
- Signed: _______________  Date: _______________
