// Nad.fun Contract ABIs
// Based on nad.fun contract structure

export const BONDING_CURVE_ROUTER_ABI = [
    "function buy(address token, address to, uint256 amountIn, uint256 amountOutMin, uint256 deadline) external payable returns (uint256 amountOut)",
    "function sell(address token, address to, uint256 amountIn, uint256 amountOutMin, uint256 deadline) external returns (uint256 amountOut)",
    "function getAmountOut(address token, uint256 amountIn, bool isBuy) external view returns (uint256 amount, address router)",
    "function getAmountIn(address token, uint256 amountOut, bool isBuy) external view returns (uint256 amount, address router)",
    "function isListed(address token) external view returns (bool)",
    "function getCurves(address token) external view returns (uint256 reserveMon, uint256 reserveToken)"
];

export const ERC20_ABI = [
    "function balanceOf(address owner) external view returns (uint256)",
    "function allowance(address owner, address spender) external view returns (uint256)",
    "function approve(address spender, uint256 amount) external returns (bool)",
    "function transfer(address to, uint256 amount) external returns (bool)",
    "function decimals() external view returns (uint8)",
    "function symbol() external view returns (string)",
    "function name() external view returns (string)",
    "function totalSupply() external view returns (uint256)"
];

export const DEX_ROUTER_ABI = [
    "function swapExactTokensForTokens(uint256 amountIn, uint256 amountOutMin, address[] calldata path, address to, uint256 deadline) external returns (uint256[] memory amounts)",
    "function swapTokensForExactTokens(uint256 amountOut, uint256 amountInMax, address[] calldata path, address to, uint256 deadline) external returns (uint256[] memory amounts)",
    "function getAmountsOut(uint256 amountIn, address[] calldata path) external view returns (uint256[] memory amounts)",
    "function getAmountsIn(uint256 amountOut, address[] calldata path) external view returns (uint256[] memory amounts)"
];

export const LENS_ABI = [
    "function getTokenInfo(address token) external view returns (tuple(address token, bool isListed, uint256 reserveMon, uint256 reserveToken, address pool))"
];
