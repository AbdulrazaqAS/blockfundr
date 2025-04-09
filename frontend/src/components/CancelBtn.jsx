export default function CancelBtn({onClick, disabled}) {
    return (
        <button disabled={disabled}
            type="button"
            className="close-btn"
            onClick={() => onClick()}
        >
            <span aria-hidden="true">&times;</span>
        </button>
    );
}