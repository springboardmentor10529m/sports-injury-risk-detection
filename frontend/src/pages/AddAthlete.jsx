import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import './AthletePages.css'

function AddAthlete() {
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

  // =========================
  // HANDLE INPUT CHANGE
  // =========================

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


  // =========================
  // VALIDATION
  // =========================

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
      newErrors.age = 'Please enter a valid age between 10 and 60.'
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


  // =========================
  // CREATE ATHLETE ID
  // =========================

  const generateAthleteId = (athletes) => {
    let maxNumber = 0

    athletes.forEach((athlete) => {
      const match = athlete.id?.match(/^ATH-(\d+)$/)

      if (match) {
        const number = Number(match[1])

        if (number > maxNumber) {
          maxNumber = number
        }
      }
    })

    return `ATH-${String(maxNumber + 1).padStart(3, '0')}`
  }


  // =========================
  // SUBMIT FORM
  // =========================

  const handleSubmit = (event) => {
    event.preventDefault()

    if (!validateForm()) {
      return
    }

    // Get previously saved athletes
    const savedAthletes =
      JSON.parse(localStorage.getItem('athletes')) || []


    // Create new ID
    const newAthleteId = generateAthleteId(savedAthletes)


    // Create athlete object
    const newAthlete = {
      id: newAthleteId,

      name: formData.name.trim(),

      sport: formData.sport,

      age: Number(formData.age),

      gender: formData.gender,

      height: `${formData.height} cm`,

      weight: `${formData.weight} kg`,

      risk: 'Low',

      score: 0,

      lastAssessment: 'Not assessed',

      activity: 'Not available',

      createdAt: new Date().toISOString(),
    }


    // Save athlete
    const updatedAthletes = [
      ...savedAthletes,
      newAthlete,
    ]

    localStorage.setItem(
      'athletes',
      JSON.stringify(updatedAthletes)
    )


    // Success message
    alert(
      `${newAthlete.name} added successfully!\nAthlete ID: ${newAthlete.id}`
    )


    // Go back to athletes list
    navigate('/athletes')
  }


  return (
    <div className="dashboard-page">

      <Sidebar />

      <main className="dashboard-main">


        {/* =========================
            TOPBAR
        ========================= */}

        <header className="dashboard-topbar">

          <div>

            <p className="dashboard-breadcrumb">
              Management / Athletes / Add Athlete
            </p>

            <h1>
              Add Athlete
            </h1>

          </div>


          <div className="dashboard-user">

            <button
              className="notification-button"
              aria-label="Notifications"
              type="button"
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
                Athlete
              </small>

            </div>

          </div>

        </header>


        {/* =========================
            BACK BUTTON
        ========================= */}

        <div className="profile-back">

          <Link to="/athletes">
            ← Back to Athletes
          </Link>

        </div>


        {/* =========================
            FORM PANEL
        ========================= */}

        <section className="dashboard-panel add-athlete-panel">


          <div className="panel-header">

            <div>

              <h3>
                Athlete Information
              </h3>

              <p>
                Enter the athlete's personal and physical information.
              </p>

            </div>

          </div>


          <form onSubmit={handleSubmit}>


            {/* =========================
                BASIC INFORMATION
            ========================= */}

            <div className="form-section-title">
              Basic Information
            </div>


            <div className="add-athlete-form-grid">


              {/* FULL NAME */}

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
                  className={errors.name ? 'input-error' : ''}
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
                  className={errors.sport ? 'input-error' : ''}
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
                  className={errors.age ? 'input-error' : ''}
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
                  className={errors.gender ? 'input-error' : ''}
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
                    className={errors.height ? 'input-error' : ''}
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
                    className={errors.weight ? 'input-error' : ''}
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


            {/* =========================
                INFORMATION BOX
            ========================= */}

            <div className="form-info-box">

              <span>
                ℹ
              </span>

              <p>
                After creating the athlete profile, you can perform
                movement analysis and generate an injury risk assessment.
                The initial risk level will be set to Low until an
                assessment is completed.
              </p>

            </div>


            {/* =========================
                ACTIONS
            ========================= */}

            <div className="form-actions">

              <Link
                to="/athletes"
                className="btn btn-outline-secondary"
              >
                Cancel
              </Link>


              <button
                type="submit"
                className="btn btn-primary"
              >
                Create Athlete
              </button>

            </div>


          </form>

        </section>

      </main>

    </div>
  )
}

export default AddAthlete