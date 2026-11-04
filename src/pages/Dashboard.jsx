import { useState } from 'react'
import Sidebar from '../components/layout/Sidebar'
import Button from '../components/common/Button'
import Modal from '../components/common/Modal'
import useAuth from '../hooks/useAuth'

const formatMemberSince = (createdAt) => {
  if (!createdAt) return '—'

  const date = new Date(createdAt)
  if (Number.isNaN(date.getTime())) return '—'

  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

export default function Dashboard() {
  const { user } = useAuth()
  const [profileOpen, setProfileOpen] = useState(false)

  const stats = [
    { label: 'Total donated', value: '$0' },
    { label: 'Causes supported', value: '0' },
    { label: 'Member since', value: formatMemberSince(user?.createdAt) },
  ]

  return (
    <div className="dashboard-layout">
      <Sidebar />

      <div className="dashboard-content">
        <h2 className="mb-30">Hello, {user?.name}</h2>

        <div className="row g-3 mb-40">
          {stats.map((stat) => (
            <div className="col-md-4" key={stat.label}>
              <div className="card h-100 border-1 rounded-3">
                <div className="card-body">
                  <p className="text-uppercase fw-bold small mb-2">{stat.label}</p>
                  <h4 className="mb-0">{stat.value}</h4>
                </div>
              </div>
            </div>
          ))}
        </div>

        <section id="donations" className="mb-40">
          <h3 className="mb-20">Donations</h3>

          <div className="table-responsive">
            <table className="table align-middle">
              <thead>
                <tr>
                  <th scope="col">Cause</th>
                  <th scope="col">Amount</th>
                  <th scope="col">Date</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={3} className="text-center py-4">
                    No donations yet
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <Button to="/#causes" variant="one">
            Explore causes
          </Button>
        </section>

        <section id="profile">
          <h3 className="mb-20">Profile</h3>

          <p className="mb-1">{user?.name}</p>
          <p className="mb-20">{user?.email}</p>

          <Button variant="two" onClick={() => setProfileOpen(true)}>
            Edit profile
          </Button>
        </section>

        <Modal open={profileOpen} onClose={() => setProfileOpen(false)} title="Edit profile">
          <p className="mb-0">Coming soon</p>
        </Modal>
      </div>
    </div>
  )
}
