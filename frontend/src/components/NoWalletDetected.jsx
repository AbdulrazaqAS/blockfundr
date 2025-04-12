export default function NoWalletDetected({setWalletDetected}) {
  return (
    <div className="error-bar">
        <p>
          No Ethereum wallet is detected.
          Please install{" "}
          <a href="http://metamask.io" target="_blank" rel="noopener noreferrer">
              MetaMask
          </a>
          . Reload page if already installed.
        </p>
        <button onClick={() => setWalletDetected(true)}>
          <span>&times;</span>
        </button>
    </div>
  );
}
