import { useRouter } from 'next/router'

export default function Landing() {
  const router = useRouter()

  return (
    <div className="landing-container">
      <button 
        className="codebase-btn"
        onClick={() => router.push('/dashboard')}
      >
        graphicsmagick
      </button>
    </div>
  )
}
