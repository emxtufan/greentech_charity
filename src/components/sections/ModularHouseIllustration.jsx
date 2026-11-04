export default function ModularHouseIllustration() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 560 420"
      role="img"
      aria-label="Ilustrație: o casă modulară"
    >
      {/* fundal */}
      <circle cx="280" cy="210" r="190" fill="#e4f8f2" />
      <ellipse cx="280" cy="352" rx="215" ry="22" fill="#cfe9dc" />

      {/* modulele de la parter */}
      <rect x="165" y="220" width="130" height="115" rx="6" fill="#2e8b57" />
      <rect x="295" y="220" width="125" height="115" rx="6" fill="#6fae4a" />

      {/* modulul de sus, retras */}
      <rect x="200" y="115" width="150" height="95" rx="6" fill="#1b6943" />

      {/* acoperiș plat cu streașină subțire */}
      <rect x="193" y="106" width="164" height="9" rx="4" fill="#0f2f22" />
      <rect x="157" y="211" width="271" height="10" rx="5" fill="#0f2f22" />

      {/* ferestre */}
      <rect x="216" y="130" width="44" height="36" rx="3" fill="#f9f4d6" stroke="#fff" strokeWidth="5" />
      <rect x="288" y="130" width="44" height="36" rx="3" fill="#f9f4d6" stroke="#fff" strokeWidth="5" />
      <rect x="186" y="238" width="52" height="44" rx="3" fill="#f9f4d6" stroke="#fff" strokeWidth="5" />
      <rect x="350" y="238" width="52" height="44" rx="3" fill="#f9f4d6" stroke="#fff" strokeWidth="5" />

      {/* ușa */}
      <rect x="306" y="272" width="32" height="63" rx="4" fill="#0f2f22" />

      {/* copac stilizat */}
      <rect x="462" y="292" width="16" height="56" rx="4" fill="#0f2f22" />
      <circle cx="470" cy="250" r="46" fill="#6fae4a" />

      {/* două frunze mici */}
      <g transform="translate(232 44) rotate(-18)">
        <path d="M0 24C0 11 11 0 24 0C24 13 13 24 0 24Z" fill="#6fae4a" />
      </g>
      <g transform="translate(300 30) rotate(22)">
        <path d="M0 24C0 11 11 0 24 0C24 13 13 24 0 24Z" fill="#2e8b57" />
      </g>
    </svg>
  )
}
