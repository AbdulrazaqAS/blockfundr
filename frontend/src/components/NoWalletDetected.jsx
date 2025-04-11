export default function NoWalletDetected() {
  return (
    <div className="error-bar">
        <p>
        No Ethereum wallet is detected.
        Please install{" "}
        <a
            href="https://www.coinbase.com/wallet"
            target="_blank"
            rel="noopener noreferrer"
        >
            Coinbase Wallet
        </a> 
        {" "}or{" "}
        <a href="http://metamask.io" target="_blank" rel="noopener noreferrer">
            MetaMask
        </a>
        . Reload page if installed.
        </p>
    </div>
  );
}
