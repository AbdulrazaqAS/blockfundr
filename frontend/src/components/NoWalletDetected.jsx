import { useEffect, useState } from "react";

export default function NoWalletDetected({setWalletDetected, scrollToNavBar}) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkIfMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || window.opera;
      if (/android|iphone|ipad|ipod/i.test(userAgent)) {
        setIsMobile(true);
      }
    };
    checkIfMobile();
    if (scrollToNavBar) scrollToNavBar();
  }, []);

  return (
    <div className="error-bar">
      {!isMobile ? (
        <>
          <p>
            No Ethereum wallet was detected.
            Please install{" "}
            <a href="http://metamask.io" target="_blank" rel="noopener noreferrer">
                MetaMask
            </a>
            . Reload page if already installed.
          </p>
          <button onClick={() => setWalletDetected(true)}>
            <span>&times;</span>
          </button>
        </>
        ) : (
          <>
            <p>
              No Ethereum wallet was detected.
              Please install{" "}
              <a href="http://metamask.io" target="_blank" rel="noopener noreferrer">
                  MetaMask
              </a>
              {" "}and visit this website from the app.
            </p>
            <button onClick={() => setWalletDetected(true)}>
              <span>&times;</span>
            </button>
          </>
        )
      }
    </div>
  );
}
