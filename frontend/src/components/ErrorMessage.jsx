export default function ErrorMessage({ message, setErrorMessage }) {
  return (
    <div className="error-bar">
      {message}
      {setErrorMessage &&
        <button onClick={() => setErrorMessage(null)}>
          <span>&times;</span>
        </button>
      }
    </div>
  );
}
