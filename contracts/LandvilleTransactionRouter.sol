// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

interface IERC20Minimal {
    function balanceOf(address account) external view returns (uint256);
}

interface IUniswapV3SwapRouter02 {
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }

    function exactInputSingle(ExactInputSingleParams calldata params)
        external
        payable
        returns (uint256 amountOut);
}

/// @notice Narrow LANDVILLE adapter for user-signed, single-pool ERC-20 swaps.
/// @dev Treasury, fee and upstream router are immutable. There is no owner and no
///      arbitrary-call surface. Deploy a new reviewed adapter to change policy.
contract LandvilleTransactionRouter {
    uint16 public constant feeBps = 100; // 1.00%
    uint16 public constant BPS = 10_000;

    address public immutable treasury;
    address public immutable swapRouter;

    uint256 private unlocked = 1;

    event LandvilleSwap(
        address indexed citizen,
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 grossAmountIn,
        uint256 treasuryFee,
        uint256 swappedAmountIn,
        uint256 amountOut,
        uint24 poolFee
    );

    error InvalidAddress();
    error InvalidSwap();
    error UnsupportedTokenBehavior();
    error TokenCallFailed();
    error Reentrancy();
    error NativeEthNotAccepted();

    constructor(address treasury_, address swapRouter_) {
        if (treasury_ == address(0) || swapRouter_ == address(0)) revert InvalidAddress();
        treasury = treasury_;
        swapRouter = swapRouter_;
    }

    modifier nonReentrant() {
        if (unlocked != 1) revert Reentrancy();
        unlocked = 2;
        _;
        unlocked = 1;
    }

    function swapExactInputSingle(
        address tokenIn,
        address tokenOut,
        uint24 poolFee,
        uint256 grossAmountIn,
        uint256 amountOutMinimum
    ) external nonReentrant returns (uint256 amountOut) {
        if (
            tokenIn == address(0) || tokenOut == address(0) || tokenIn == tokenOut
                || grossAmountIn < 100 || amountOutMinimum == 0
        ) revert InvalidSwap();

        uint256 treasuryFee = grossAmountIn / 100;
        uint256 swappedAmountIn = grossAmountIn - treasuryFee;
        uint256 beforeBalance = IERC20Minimal(tokenIn).balanceOf(address(this));
        _safeTransferFrom(tokenIn, msg.sender, address(this), grossAmountIn);
        uint256 received = IERC20Minimal(tokenIn).balanceOf(address(this)) - beforeBalance;
        if (received != grossAmountIn) revert UnsupportedTokenBehavior();

        _safeTransfer(tokenIn, treasury, treasuryFee);
        _forceApprove(tokenIn, swapRouter, swappedAmountIn);
        amountOut = IUniswapV3SwapRouter02(swapRouter).exactInputSingle(
            IUniswapV3SwapRouter02.ExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: tokenOut,
                fee: poolFee,
                recipient: msg.sender,
                amountIn: swappedAmountIn,
                amountOutMinimum: amountOutMinimum,
                sqrtPriceLimitX96: 0
            })
        );
        _forceApprove(tokenIn, swapRouter, 0);

        emit LandvilleSwap(
            msg.sender,
            tokenIn,
            tokenOut,
            grossAmountIn,
            treasuryFee,
            swappedAmountIn,
            amountOut,
            poolFee
        );
    }

    /// @notice Sends accidentally stranded ERC-20 balances only to the immutable treasury.
    function sweepToTreasury(address token) external nonReentrant {
        if (token == address(0)) revert InvalidAddress();
        uint256 amount = IERC20Minimal(token).balanceOf(address(this));
        if (amount != 0) _safeTransfer(token, treasury, amount);
    }

    receive() external payable {
        revert NativeEthNotAccepted();
    }

    fallback() external payable {
        revert NativeEthNotAccepted();
    }

    function _safeTransfer(address token, address to, uint256 amount) private {
        (bool success, bytes memory result) = token.call(
            abi.encodeWithSelector(bytes4(keccak256("transfer(address,uint256)")), to, amount)
        );
        if (!success || (result.length != 0 && !abi.decode(result, (bool)))) revert TokenCallFailed();
    }

    function _safeTransferFrom(address token, address from, address to, uint256 amount) private {
        (bool success, bytes memory result) = token.call(
            abi.encodeWithSelector(bytes4(keccak256("transferFrom(address,address,uint256)")), from, to, amount)
        );
        if (!success || (result.length != 0 && !abi.decode(result, (bool)))) revert TokenCallFailed();
    }

    function _forceApprove(address token, address spender, uint256 amount) private {
        (bool success, bytes memory result) = token.call(
            abi.encodeWithSelector(bytes4(keccak256("approve(address,uint256)")), spender, amount)
        );
        if (success && (result.length == 0 || abi.decode(result, (bool)))) return;
        _approve(token, spender, 0);
        _approve(token, spender, amount);
    }

    function _approve(address token, address spender, uint256 amount) private {
        (bool success, bytes memory result) = token.call(
            abi.encodeWithSelector(bytes4(keccak256("approve(address,uint256)")), spender, amount)
        );
        if (!success || (result.length != 0 && !abi.decode(result, (bool)))) revert TokenCallFailed();
    }
}
