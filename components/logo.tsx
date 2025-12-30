import Image from 'next/image'

interface LogoProps {
  className?: string
  width?: number
  height?: number
}

export default function Logo({ className = '', width = 150, height = 30 }: LogoProps) {
  return (
    <Image
      src="/images/logo/o2pluss_logo.svg"
      alt="O2PLUSS"
      width={width}
      height={height}
      className={className}
      priority
    />
  )
}


