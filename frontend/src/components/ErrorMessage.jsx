export default function ErrorMessage({ message, setErrorMessage }) {
  return (
    <div className="error-bar" role="alert">
      {message}
      <button
        type="button"
        className="close"
        data-dismiss="alert"
        aria-label="Close"
        onClick={() => setErrorMessage(null)}
      >
        <span aria-hidden="true">&times;</span>
      </button>
    </div>
  );
}
