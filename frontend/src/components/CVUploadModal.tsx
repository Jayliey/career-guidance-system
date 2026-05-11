import { useState, ChangeEvent } from "react";

interface CVUploadModalProps {
  userId?: string | null;
  userEmail?: string | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function CVUploadModal({ userId, userEmail, onClose, onSaved }: CVUploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [detectedSkills, setDetectedSkills] = useState<string[]>([]);
  const [detectedInterests, setDetectedInterests] = useState<string[]>([]);
  const [stage, setStage] = useState<'upload' | 'preview'>('upload');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setSuccess(null);
    const selected = event.target.files?.[0] ?? null;
    setFile(selected);
    setDetectedSkills([]);
    setDetectedInterests([]);
    setStage('upload');
  };

  const uploadCv = async () => {
    if (!file) {
      setError('Please choose a CV file first.');
      return;
    }
    if (!userId) {
      setError('Unable to identify your user account. Please refresh and try again.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('cv', file);
      formData.append('userId', userId);

      const res = await fetch('http://localhost:5000/api/upload-cv', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      setDetectedSkills(data.detectedSkills || []);
      setDetectedInterests(data.detectedInterests || []);
      setStage('preview');
    } catch (err: any) {
      setError(err.message || 'Unable to upload CV');
    } finally {
      setLoading(false);
    }
  };

  const confirmDetection = async () => {
    if (!userId) {
      setError('Unable to identify your user account.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch('http://localhost:5000/api/confirm-cv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          email: userEmail,
          skills: detectedSkills,
          interests: detectedInterests,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Save failed');
      }
      setSuccess('CV detection saved to your profile. Re-running recommendations now.');
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Unable to save CV suggestions');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>Upload your CV</h2>
        {error && <div className="error-text">{error}</div>}
        {success && <div className="success-text">{success}</div>}

        {stage === 'upload' ? (
          <>
            <div className="form-group">
              <label htmlFor="cv-upload">Choose a CV file (PDF, DOCX, TXT)</label>
              <input
                id="cv-upload"
                type="file"
                accept=".pdf,.docx,.txt"
                onChange={handleFileChange}
              />
            </div>
            <div className="modal-buttons">
              <button onClick={uploadCv} disabled={loading || !file}>
                {loading ? 'Scanning...' : 'Scan CV'}
              </button>
              <button onClick={onClose}>Cancel</button>
            </div>
          </>
        ) : (
          <>
            <div className="form-group">
              <p><strong>Detected Skills</strong></p>
              {detectedSkills.length > 0 ? (
                <ul className="detected-list">
                  {detectedSkills.map((skill, idx) => <li key={idx}>{skill}</li>)}
                </ul>
              ) : (
                <p>No skills detected from the file.</p>
              )}
            </div>
            <div className="form-group">
              <p><strong>Detected Interests</strong></p>
              {detectedInterests.length > 0 ? (
                <ul className="detected-list">
                  {detectedInterests.map((interest, idx) => <li key={idx}>{interest}</li>)}
                </ul>
              ) : (
                <p>No interest keywords detected from the file.</p>
              )}
            </div>
            <div className="modal-buttons">
              <button onClick={confirmDetection} disabled={loading}>
                {loading ? 'Saving...' : 'Save to Profile'}
              </button>
              <button onClick={onClose}>Close</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
