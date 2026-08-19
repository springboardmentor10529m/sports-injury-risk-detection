import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import './AthletePages.css'

function EditAthlete() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [formData, setFormData] = useState({
    name: '',
    sport: '',
    age: '',
    gender: '',
    height: '',
    weight: '',
  })

  const [errors, setErrors] = useState({})
  const [athleteNotFound, setAthleteNotFound] = useState(false)

  useEffect(() => {
    const savedAthletes =
      JSON.parse(localStorage.getItem('athletes')) || []

    const athlete = savedAthletes.find(
      (item) => item.id === id
    )

    if (!athlete) {
      setAthleteNotFound(true)
      return
    }

    setFormData({
      name: athlete.name || '',
      sport: athlete.sport || '',
      age: athlete.age || '',
      gender: athlete.gender || '',
      height: athlete.height
        ? String(athlete.height).replace(' cm', '')
        : '',
      weight: athlete.weight
        ? String(athlete.weight).replace(' kg', '')
        : '',
    })
  }, [id])

  const handleChange = (event) => {
    const { name, value } = event.target

    setFormData((previousData) => ({
      ...previousData,
      [name]: value,
    }))

    setErrors((previousErrors) => ({
      ...previousErrors,
      [name]: '',
    }))
  }

  const validateForm = () => {
    const newErrors = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Full name is required.'
    }

    if (!formData.sport) {
      newErrors.sport = 'Please select a sport.'
    }

    if (!formData.age) {
      newErrors.age = 'Age is required.'
    } else if (
      Number(formData.age) < 10 ||
      Number(formData.age) > 60
    ) {
      newErrors.age = 'Please enter a valid age.'
    }

    if (!formData.gender) {
      newErrors.gender = 'Please select gender.'
    }

    if (!formData.height) {
      newErrors.height = 'Height is required.'
    } else if (
      Number(formData.height) < 50 ||
      Number(formData.height) > 250
    ) {
      newErrors.height = 'Please enter a valid height.'
    }

    if (!formData.weight) {
      newErrors.weight = 'Weight is required.'
    } else if (
      Number(formData.weight) < 20 ||
      Number(formData.weight) > 250
    ) {
      newErrors.weight = 'Please enter a valid weight.'
    }

    setErrors(newErrors)

    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (event) => {
    event.preventDefault()

    if (!validateForm()) {
      return
    }

    const savedAthletes =
      JSON.parse(localStorage.getItem('athletes')) || []

    const updatedAthletes = savedAthletes.map(
      (athlete) => {
        if (athlete.id !== id) {
          return athlete
        }

        return {
          ...athlete,
          name: formData.name.trim(),
          sport: formData.sport,
          age: Number(formData.age),
          gender: formData.gender,
          height: `${formData.height} cm`,
          weight: `${formData.weight} kg`,
        }
      }
    )

    localStorage.setItem(
      'athletes',
      JSON.stringify(updatedAthletes)
    )

    alert('Athlete profile updated successfully!')

    navigate(`/athletes/${id}`)
  }

  if (athleteNotFound) {
    return (
      <div className="dashboard-page">

        <Sidebar />

        <main className="dashboard-main">

          <header className="dashboard-topbar">

            <div>
              <p className="dashboard-breadcrumb">
                Management / Athletes / Edit
              </p>

              <h1>
                Edit Athlete
              </h1>
            </div>

          </header>

          <div className="dashboard-content">

            <div className="dashboard-panel">

              <h3>
                Athlete Not Found
              </h3>

              <p>
                No athlete profile was found for ID: {id}
              </p>

              <Link
                to="/athletes"
                className="btn btn-primary"
              >
                ← Back to Athletes
              </Link>

            </div>

          </div>

        </main>

      </div>
    )
  }

  return (
    <div className="dashboard-page">

      <Sidebar />

      <main className="dashboard-main">

        {/* TOPBAR */}

        <header className="dashboard-topbar">

          <div>

            <p className="dashboard-breadcrumb">
              Management / Athletes / Edit Athlete
            </p>

            <h1>
              Edit Athlete
            </h1>

          </div>


          <div className="dashboard-user">

            <button
              className="notification-button"
              type="button"
              aria-label="Notifications"
            >
              ♧
              <span></span>
            </button>

            <div className="user-avatar">
              S
            </div>

            <div className="user-info">

              <strong>
                Soumyajit
              </strong>

              <small>
                Coach
              </small>

            </div>

          </div>

        </header>


        {/* BACK */}

        <div className="profile-back">

          <Link to={`/athletes/${id}`}>
            ← Back to Profile
          </Link>

        </div>


        {/* FORM */}

        <section className="dashboard-panel add-athlete-panel">

          <div className="panel-header">

            <div>

              <h3>
                Edit Athlete Information
              </h3>

              <p>
                Update the athlete's personal and physical information.
              </p>

            </div>

          </div>


          <form onSubmit={handleSubmit}>

            <div className="form-section-title">
              Basic Information
            </div>


            <div className="add-athlete-form-grid">

              {/* NAME */}

              <div className="athlete-form-group full-width">

                <label htmlFor="name">
                  Full Name
                </label>

                <input
                  id="name"
                  name="name"
                  type="text"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Enter athlete's full name"
                  className={
                    errors.name ? 'input-error' : ''
                  }
                />

                {errors.name && (
                  <small className="form-error">
                    {errors.name}
                  </small>
                )}

              </div>


              {/* SPORT */}

              <div className="athlete-form-group">

                <label htmlFor="sport">
                  Sport
                </label>

                <select
                  id="sport"
                  name="sport"
                  value={formData.sport}
                  onChange={handleChange}
                  className={
                    errors.sport ? 'input-error' : ''
                  }
                >

                  <option value="">
                    Select sport
                  </option>

                  <option value="Football">
                    Football
                  </option>

                  <option value="Basketball">
                    Basketball
                  </option>

                  <option value="Athletics">
                    Athletics
                  </option>

                  <option value="Cricket">
                    Cricket
                  </option>

                  <option value="Tennis">
                    Tennis
                  </option>

                </select>

                {errors.sport && (
                  <small className="form-error">
                    {errors.sport}
                  </small>
                )}

              </div>


              {/* AGE */}

              <div className="athlete-form-group">

                <label htmlFor="age">
                  Age
                </label>

                <input
                  id="age"
                  name="age"
                  type="number"
                  value={formData.age}
                  onChange={handleChange}
                  placeholder="Enter age"
                  min="10"
                  max="60"
                  className={
                    errors.age ? 'input-error' : ''
                  }
                />

                {errors.age && (
                  <small className="form-error">
                    {errors.age}
                  </small>
                )}

              </div>


              {/* GENDER */}

              <div className="athlete-form-group">

                <label htmlFor="gender">
                  Gender
                </label>

                <select
                  id="gender"
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  className={
                    errors.gender ? 'input-error' : ''
                  }
                >

                  <option value="">
                    Select gender
                  </option>

                  <option value="Male">
                    Male
                  </option>

                  <option value="Female">
                    Female
                  </option>

                  <option value="Other">
                    Other
                  </option>

                </select>

                {errors.gender && (
                  <small className="form-error">
                    {errors.gender}
                  </small>
                )}

              </div>


              {/* HEIGHT */}

              <div className="athlete-form-group">

                <label htmlFor="height">
                  Height
                </label>

                <div className="input-with-unit">

                  <input
                    id="height"
                    name="height"
                    type="number"
                    value={formData.height}
                    onChange={handleChange}
                    placeholder="Enter height"
                    min="50"
                    max="250"
                    className={
                      errors.height ? 'input-error' : ''
                    }
                  />

                  <span>
                    cm
                  </span>

                </div>

                {errors.height && (
                  <small className="form-error">
                    {errors.height}
                  </small>
                )}

              </div>


              {/* WEIGHT */}

              <div className="athlete-form-group">

                <label htmlFor="weight">
                  Weight
                </label>

                <div className="input-with-unit">

                  <input
                    id="weight"
                    name="weight"
                    type="number"
                    value={formData.weight}
                    onChange={handleChange}
                    placeholder="Enter weight"
                    min="20"
                    max="250"
                    className={
                      errors.weight ? 'input-error' : ''
                    }
                  />

                  <span>
                    kg
                  </span>

                </div>

                {errors.weight && (
                  <small className="form-error">
                    {errors.weight}
                  </small>
                )}

              </div>

            </div>


            {/* INFO */}

            <div className="form-info-box">

              <span>
                ℹ
              </span>

              <p>
                Updating this information will modify the
                athlete profile. Existing risk assessment
                information will remain unchanged.
              </p>

            </div>


            {/* ACTIONS */}

            <div className="form-actions">

              <Link
                to={`/athletes/${id}`}
                className="btn btn-outline-secondary"
              >
                Cancel
              </Link>

              <button
                type="submit"
                className="btn btn-primary"
              >
                Save Changes
              </button>

            </div>

          </form>

        </section>

      </main>

    </div>
  )
}

export default EditAthlete