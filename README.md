# Masdar - Qatar University Academic Resource Platform

> A centralized platform for Qatar University students to access, share, and request educational resources including lecture notes, past exams, papers, and course materials.

## Why I Built This

As a student at Qatar University, I noticed a recurring problem that affected me and my peers. We were all struggling to find academic materials - lecture notes, past exams, study guides - because everything was scattered across different platforms, WhatsApp groups, and personal collections. There was no central place where we could reliably access or share these resources.

I saw students spending hours searching for materials that someone else already had. I watched as valuable resources got lost because there was no organized system to preserve them. Course materials that could help future students were trapped in individual devices or forgotten group chats.

That's when I decided to build **Masdar** - a platform that would solve these problems for our university community.

## What Masdar Does

I designed Masdar to be a comprehensive solution where:

- **Everything is in one place**: All course materials are centralized and easy to access, so you don't have to hunt through multiple channels to find what you need.

- **Students contribute together**: The platform is community-driven. Anyone can submit resources for existing courses or request new courses to be added, making it a collaborative space.

- **Navigation is simple**: I built an intuitive interface that lets you browse courses by department and quickly find the materials you're looking for.

- **It's secure and scalable**: I implemented JWT authentication for administrative functions and used cloud-based storage to ensure the platform can grow with our needs.

- **Downloads are fast**: By leveraging Cloudflare R2 for storage, I ensured that accessing and downloading content is quick and reliable.

## Technical Architecture

### Tech Stack
- **Backend**: Node.js with Express.js
- **Database**: MongoDB for storing course and resource metadata
- **Storage**: AWS S3 / Cloudflare R2 for file storage
- **Authentication**: JWT-based authentication for admin panel
- **Deployment**: Vercel for seamless hosting
- **Frontend**: Vanilla JavaScript with modern ES6+ features

### Key Features

I built the following features to make the platform as useful as possible:

- Browse courses organized by department and category
- Download lecture notes, past exams, and papers with one click
- Submit your own resources to help other students
- Request new courses that aren't yet available
- Admin panel with secure authentication for content moderation
- Fast content delivery through CDN integration

## Application Screenshots

### Home Page
<p align="center">
  <img src="images/HomeScreen.png" alt="Masdar Home Page" width="800"/>
</p>

*Browse all available courses and resources organized by department*

### Course Details
<p align="center">
  <img src="images/CourseDetail.png" alt="Course Detail View" width="800"/>
</p>

*View detailed information about courses and download available materials*

### Submit Resources
<p align="center">
  <img src="images/SubmitResource.png" alt="Submit Resource Page" width="800"/>
</p>

*Students can contribute by submitting resources for existing courses*

### Request New Courses
<p align="center">
  <img src="images/SubmitCourse.png" alt="Request Course Page" width="800"/>
</p>

*Request courses that aren't yet available on the platform*

### About Page
<p align="center">
  <img src="images/AboutPage.png" alt="About Page" width="800"/>
</p>

*Learn more about the platform's mission and features*

## 🚀 Getting Started

### Prerequisites
- Node.js (v14 or higher)
- MongoDB instance
- AWS S3 or Cloudflare R2 account
- Environment variables configured

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Ahmed-Elsheshtawy/qu-educational-content.git
   cd qu-educational-content/source
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   Create a `.env` file in the source directory:
   ```env
   MONGODB_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret_key
   AWS_ACCESS_KEY_ID=your_aws_access_key
   AWS_SECRET_ACCESS_KEY=your_aws_secret_key
   AWS_REGION=your_aws_region
   S3_BUCKET_NAME=your_bucket_name
   ```

4. **Start the server**
   ```bash
   npm start
   ```

5. **Access the application**
   Open your browser and navigate to `http://localhost:3000`

## Project Structure

```
source/
├── server.js              # Main Express server
├── package.json           # Project dependencies
├── vercel.json           # Vercel deployment config
└── public/
    ├── frontend/          # Client-side application
    │   ├── index.html
    │   ├── scripts/       # JavaScript modules
    │   ├── styles/        # CSS stylesheets
    │   └── views/         # HTML pages
    ├── middleware/        # Authentication & JWT middleware
    ├── routes/            # API route handlers
    └── services/          # Business logic & external services
```

## Security

I took security seriously while building this platform:

- Implemented JWT-based authentication for all administrative functions
- Used secure cookie handling for session management
- Set up environment-based configuration to protect sensitive credentials
- Protected admin routes to ensure only authorized users can moderate content

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/courses` | GET | Retrieve all courses |
| `/api/resources` | GET | Retrieve all resources |
| `/api/auth/login` | POST | Admin authentication |
| `About the Author

My name is **Ahmed Elsheshtawy**, and I'm a student at Qatar University. I built this platform because I experienced firsthand the frustration of not having easy access to academic resources. I wanted to create something that would make student life easier and foster a culture of collaboration and knowledge sharing.

If you have questions, suggestions, or just want to connect, feel free to reach out:

- GitHub: [@Ahmed-Elsheshtawy](https://github.com/Ahmed-Elsheshtawy)
- Project Repository: [QU Academic Content Platform](https://github.com/Ahmed-Elsheshtawy/qu-educational-content)

## License

This project is licensed under the ISC License.

## Contributing

I welcome contributions from anyone who wants to improve this platform! Whether you're a student at QU or just someone who wants to help, here's how you can contribute:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/YourFeature`)
3. Commit your changes (`git commit -m 'Add your feature'`)
4. Push to the branch (`git push origin feature/YourFeature`)
5. Open a Pull Request

I'll review your contribution and work with you to get it merged.

## Acknowledgments

I want to thank my fellow Qatar University students for inspiring this project and providing valuable feedback. I also want to acknowledge the open-source community for creating the incredible tools and libraries that made this platform possible.

---

<p align="center">Built with dedication

<p align="center">Made with ❤️ for Qatar University Students</p>
