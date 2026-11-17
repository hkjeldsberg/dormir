import { CheckIn } from '@/components/CheckIn'
import { Overview } from '@/components/Overview'

export default function HomePage() {
  return (
    <>
      <div className="lg:hidden">
        <CheckIn sticky />
      </div>
      <div className="hidden lg:block">
        <Overview />
      </div>
    </>
  )
}
