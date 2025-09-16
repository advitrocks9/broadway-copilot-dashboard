# Broadway Copilot Dashboard

This is a dashboard application built with Next.js, TypeScript, and Tailwind CSS. It features user authentication, data visualization, and a responsive layout.

## ✨ Features

-   **Authentication:** Secure login and session management using NextAuth.js.
-   **Dashboard:** An overview page with various charts (Bar, Line, Pie) to visualize data.
-   **User Management:** A table to display and manage users.
-   **Debugging:** A dedicated page for debugging and viewing raw data.
-   **Responsive Design:** Adapts to different screen sizes for a seamless experience on desktop and mobile.

## 🛠️ Tech Stack

-   **Framework:** [Next.js](https://nextjs.org/)
-   **Language:** [TypeScript](https://www.typescriptlang.org/)
-   **Styling:** [Tailwind CSS](https://tailwindcss.com/)
-   **UI Components:** [shadcn/ui](https://ui.shadcn.com/)
-   **Authentication:** [NextAuth.js](https://next-auth.js.org/)
-   **Database ORM:** [Prisma](https://www.prisma.io/)
-   **Charts:** [Recharts](https://recharts.org/)

## 🚀 Getting Started

### Prerequisites

-   Node.js (v18.x or later)
-   npm, yarn, or pnpm
-   A PostgreSQL database (or any other database supported by Prisma)

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/broadway_copilot_dashboard.git
    cd broadway_copilot_dashboard
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Set up environment variables:**
    Create a `.env.local` file in the root of the project and add the necessary environment variables. You can use `.env.example` as a template if it exists.
    ```bash
    DATABASE_URL="postgresql://user:password@host:port/database"
    NEXTAUTH_URL="http://localhost:3000"
    NEXTAUTH_SECRET="your-secret-here"
    ```

4.  **Apply database migrations:**
    ```bash
    npx prisma migrate dev
    ```

5.  **Run the development server:**
    ```bash
    npm run dev
    ```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## ☁️ Deployment

This project is configured for deployment to Google Cloud Run using Docker and GitHub Actions. The workflow is defined in `.github/workflows/google-cloudrun-deploy.yml`.

When changes are pushed to the `main` branch, the workflow will automatically build a Docker image and deploy it to Google Cloud Run.
