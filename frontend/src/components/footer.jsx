import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCopyright, faFaucetDrip, faTree } from '@fortawesome/free-solid-svg-icons';
import { faDev, faGithub } from '@fortawesome/free-brands-svg-icons';

const GITHUB_REPO_URL = "https://github.com/AbdulrazaqAS/blockfundr.git";
const DEVTO_URL = "https://dev.to/abdulrazaqas";
const LINKTREE_URL = "https://linktr.ee/abdulrazaqas";

export default function Footer({faucetUrl}){
    return (
        <footer>
            <img src='blockfundr_cover.png' alt='logo' />
            <ul>
                <li><a href={LINKTREE_URL} target='_blank' rel="noreferrer noopener"><FontAwesomeIcon icon={faTree} size="2xl" /><p>Linktr</p></a></li>
                <li><a href={GITHUB_REPO_URL} target='_blank' rel="noreferrer noopener"><FontAwesomeIcon icon={faGithub} size="2xl" /><p>Github</p></a></li>
                <li id="devto_icon"><a href={DEVTO_URL} target='_blank' rel="noreferrer noopener"><FontAwesomeIcon icon={faDev} size="2xl" /><p>Dev.To</p></a></li>
                <li><a href={faucetUrl} target='_blank' rel="noreferrer noopener"><FontAwesomeIcon icon={faFaucetDrip} size="2xl" /><p>Faucet</p></a></li>
            </ul>
            <p><span><FontAwesomeIcon icon={faCopyright} /></span> 2025 BlockFundr</p>
        </footer>
    )
}