-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Mar 25, 2026 at 05:56 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `placement_tracker`
--

-- --------------------------------------------------------

--
-- Table structure for table `applications`
--

CREATE TABLE `applications` (
  `application_id` int(11) NOT NULL,
  `student_id` int(11) DEFAULT NULL,
  `job_id` int(11) DEFAULT NULL,
  `status` varchar(50) DEFAULT 'Applied',
  `salary` decimal(10,2) DEFAULT 0.00
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `applications`
--

INSERT INTO `applications` (`application_id`, `student_id`, `job_id`, `status`, `salary`) VALUES
(1, 1, 1, 'Applied', 0.00),
(2, 2, 2, 'Selected', 0.00),
(12, 3, 1, 'Rejected', 543.00),
(13, 3, 6, 'Pending', 0.00),
(14, 3, 7, NULL, 444.00),
(15, 3, 3, 'Rejected', 30000.00),
(16, 3, 3, 'Pending', 0.00),
(17, 3, 3, 'Pending', 0.00),
(18, 3, 4, 'Pending', 0.00),
(19, 3, 8, 'Pending', 0.00),
(20, 3, 6, 'Pending', 0.00),
(21, 3, 6, 'Pending', 0.00),
(22, 3, 4, 'Pending', 0.00),
(23, 3, 5, 'Pending', 0.00),
(24, 3, 7, 'Pending', 0.00),
(25, 3, 7, 'Pending', 0.00),
(26, 3, 4, 'Pending', 0.00),
(27, 3, 6, 'Pending', 0.00),
(28, 3, 2, 'Pending', 0.00),
(29, 3, 2, 'Pending', 0.00),
(30, 3, 6, 'Pending', 0.00),
(31, 3, 6, 'Pending', 0.00),
(32, 3, 7, 'Pending', 0.00),
(33, 3, 8, 'Pending', 0.00),
(34, 3, 2, 'Pending', 0.00),
(35, 3, 8, 'Pending', 0.00),
(37, 3, 4, 'Accepted', 40000.00),
(38, 3, 3, 'Pending', 0.00),
(39, 3, 3, 'Pending', 0.00),
(40, 3, 6, 'Accepted', 400.00),
(41, 3, 4, 'Pending', 0.00),
(42, 3, 9, 'Accepted', 400.00);

--
-- Triggers `applications`
--
DELIMITER $$
CREATE TRIGGER `after_application_insert` AFTER INSERT ON `applications` FOR EACH ROW BEGIN
    DECLARE v_student_name VARCHAR(100);
    DECLARE v_usn VARCHAR(50);
    DECLARE v_job_title VARCHAR(100);
    DECLARE v_company_name VARCHAR(100);
    
    SELECT s.full_name, s.usn INTO v_student_name, v_usn
    FROM Students s WHERE s.student_id = NEW.student_id;
    
    SELECT j.job_title, c.company_name INTO v_job_title, v_company_name
    FROM Jobs j 
    JOIN Companies c ON j.company_id = c.company_id
    WHERE j.job_id = NEW.job_id;
    
    INSERT INTO application_history 
    (application_id, student_usn, student_name, job_title, company_name, old_status, new_status, old_salary, new_salary, action_type)
    VALUES 
    (NEW.application_id, v_usn, v_student_name, v_job_title, v_company_name, NULL, NEW.status, NULL, NEW.salary, 'APPLIED');
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `after_application_update` AFTER UPDATE ON `applications` FOR EACH ROW BEGIN
    DECLARE v_student_name VARCHAR(100);
    DECLARE v_usn VARCHAR(50);
    DECLARE v_job_title VARCHAR(100);
    DECLARE v_company_name VARCHAR(100);
    
    SELECT s.full_name, s.usn INTO v_student_name, v_usn
    FROM Students s WHERE s.student_id = NEW.student_id;
    
    SELECT j.job_title, c.company_name INTO v_job_title, v_company_name
    FROM Jobs j 
    JOIN Companies c ON j.company_id = c.company_id
    WHERE j.job_id = NEW.job_id;
    
    INSERT INTO application_history 
    (application_id, student_usn, student_name, job_title, company_name, old_status, new_status, old_salary, new_salary, action_type)
    VALUES 
    (NEW.application_id, v_usn, v_student_name, v_job_title, v_company_name, OLD.status, NEW.status, OLD.salary, NEW.salary, 'STATUS_UPDATED');
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `application_history`
--

CREATE TABLE `application_history` (
  `history_id` int(11) NOT NULL,
  `application_id` int(11) NOT NULL,
  `student_usn` varchar(50) DEFAULT NULL,
  `student_name` varchar(100) DEFAULT NULL,
  `job_title` varchar(100) DEFAULT NULL,
  `company_name` varchar(100) DEFAULT NULL,
  `old_status` varchar(50) DEFAULT NULL,
  `new_status` varchar(50) DEFAULT NULL,
  `old_salary` decimal(10,2) DEFAULT NULL,
  `new_salary` decimal(10,2) DEFAULT NULL,
  `changed_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `action_type` varchar(20) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `application_history`
--

INSERT INTO `application_history` (`history_id`, `application_id`, `student_usn`, `student_name`, `job_title`, `company_name`, `old_status`, `new_status`, `old_salary`, `new_salary`, `changed_at`, `action_type`) VALUES
(1, 37, '4NI23IS027', 'rohan', 'softawer', 'google', 'Pending', 'Accepted', 0.00, 40000.00, '2026-03-22 09:16:03', 'STATUS_UPDATED'),
(2, 42, '4NI23IS027', 'rohan', 'skilled worker', 'my', 'Pending', 'Accepted', 0.00, 400.00, '2026-03-23 20:28:50', 'STATUS_UPDATED');

-- --------------------------------------------------------

--
-- Table structure for table `companies`
--

CREATE TABLE `companies` (
  `company_id` int(11) NOT NULL,
  `company_name` varchar(100) DEFAULT NULL,
  `location` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `companies`
--

INSERT INTO `companies` (`company_id`, `company_name`, `location`) VALUES
(1, 'Tech Solutions Inc.', 'Mysuru'),
(2, 'DataWorks', 'Bengaluru'),
(3, 'tech me', 'pune'),
(4, 'google', 'Remote'),
(5, 'dd', 'p'),
(6, 'Test Company', 'San Francisco'),
(7, 'my', 'mumbai'),
(8, 'sV ', 'wAFV'),
(9, 'regdsedbg', 'pune');

-- --------------------------------------------------------

--
-- Stand-in structure for view `companywiseplacement`
-- (See below for the actual view)
--
CREATE TABLE `companywiseplacement` (
`company_name` varchar(100)
,`total_applications` bigint(21)
,`placed_students` bigint(21)
,`avg_salary` decimal(11,2)
,`max_salary` decimal(10,2)
);

-- --------------------------------------------------------

--
-- Stand-in structure for view `eligiblestudents`
-- (See below for the actual view)
--
CREATE TABLE `eligiblestudents` (
`usn` varchar(50)
,`full_name` varchar(100)
,`branch` varchar(255)
,`cgpa` decimal(3,2)
,`skills` text
);

-- --------------------------------------------------------

--
-- Table structure for table `jobs`
--

CREATE TABLE `jobs` (
  `job_id` int(11) NOT NULL,
  `job_title` varchar(100) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `company_id` int(11) DEFAULT NULL,
  `salary` varchar(255) DEFAULT 'Not Specified',
  `location` varchar(255) DEFAULT 'Not Specified',
  `cgpa_required` decimal(4,2) DEFAULT 0.00,
  `skills` varchar(255) DEFAULT 'Not Specified',
  `experience` varchar(255) DEFAULT 'Not Specified',
  `education` varchar(255) DEFAULT 'Not Specified',
  `preferences` varchar(255) DEFAULT 'Not Specified',
  `allowed_branches` varchar(255) DEFAULT 'ALL'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `jobs`
--

INSERT INTO `jobs` (`job_id`, `job_title`, `description`, `company_id`, `salary`, `location`, `cgpa_required`, `skills`, `experience`, `education`, `preferences`, `allowed_branches`) VALUES
(1, 'Software Engineer', 'Build awesome web applications', 1, 'Not Specified', 'Not Specified', 0.00, 'Not Specified', 'Not Specified', 'Not Specified', 'Not Specified', 'cse'),
(2, 'Data Analyst', 'Analyze company data and create reports', 2, 'Not Specified', 'Not Specified', 6.00, 'writer', '3+ years', 'any thing', 'girl', 'ALL'),
(3, 'worker', 'skilled worker', 2, 'Not Specified', 'Not Specified', 0.00, 'Not Specified', 'Not Specified', 'Not Specified', 'Not Specified', 'ALL'),
(4, 'softawer', 'hi', 4, '3000', 'Not Specified', 0.00, 'Not Specified', 'Not Specified', 'Not Specified', 'Not Specified', 'ALL'),
(5, 'worker', 'hiii', 4, '3000', 'Not Specified', 0.00, 'Not Specified', 'Not Specified', 'Not Specified', 'Not Specified', 'ALL'),
(6, 'goo', 'zdf', 4, '32', 'Not Specified', 0.00, 'Not Specified', 'Not Specified', 'Not Specified', 'Not Specified', 'ALL'),
(7, 'dddd', 'rdg', 5, '444', 'p', 0.00, 'Not Specified', 'Not Specified', 'Not Specified', 'Not Specified', 'ALL'),
(8, 'Software Engineer', 'Testing job description.', 6, '100000', 'San Francisco', 8.00, 'Ruby, Rails', 'Fresher', '', '', 'ALL'),
(9, 'skilled worker', 'skilled eorker', 7, '3000', 'mumbai', 3.00, 'java', 'Fresher', 'be', 'both', 'ALL'),
(10, 'fdv', 'vSa', 8, 'VSc', 'wAFV', 4.50, 'afc', 'Fresher', 'SV', 'aef', 'ALL'),
(11, 'hgsdf', 'aerbghdrnhxb', 9, '43w67587', 'pune', 7.67, 'arfvgsethbrd', 'Fresher', 'aergsdbh', 'SGVazeb', 'cse');

-- --------------------------------------------------------

--
-- Table structure for table `notifications`
--

CREATE TABLE `notifications` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `message` text NOT NULL,
  `is_read` tinyint(4) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `notifications`
--

INSERT INTO `notifications` (`id`, `user_id`, `message`, `is_read`, `created_at`) VALUES
(1, 4, '✅ Your application for <strong>worker</strong> at <strong>DataWorks</strong> has been <strong>Accepted</strong>!', 1, '2026-03-21 14:22:55'),
(2, 4, '✅ Your application for <strong>worker</strong> at <strong>DataWorks</strong> has been <strong>Accepted</strong>!', 1, '2026-03-21 14:23:35'),
(3, 4, '✅ Your application for <strong>worker</strong> at <strong>DataWorks</strong> has been <strong>Accepted</strong>!', 1, '2026-03-21 14:23:43'),
(4, 4, '❌ Your application for <strong>worker</strong> at <strong>DataWorks</strong> has been <strong>Rejected</strong>!', 1, '2026-03-21 14:31:33'),
(5, 4, '✅ Your application for <strong>goo</strong> at <strong>google</strong> has been <strong>Accepted</strong>!', 1, '2026-03-21 14:35:35'),
(6, 4, '✅ Your application for <strong>softawer</strong> at <strong>google</strong> has been <strong>Accepted</strong>!', 1, '2026-03-22 09:16:04'),
(7, 4, '✅ Your application for <strong>skilled worker</strong> at <strong>my</strong> has been <strong>Accepted</strong>!', 1, '2026-03-23 20:28:51');

-- --------------------------------------------------------

--
-- Table structure for table `offcampus_jobs`
--

CREATE TABLE `offcampus_jobs` (
  `id` int(11) NOT NULL,
  `company_name` varchar(100) DEFAULT NULL,
  `job_title` varchar(100) DEFAULT NULL,
  `salary` varchar(100) DEFAULT NULL,
  `location` varchar(100) DEFAULT NULL,
  `apply_link` text DEFAULT NULL,
  `description` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `offcampus_jobs`
--

INSERT INTO `offcampus_jobs` (`id`, `company_name`, `job_title`, `salary`, `location`, `apply_link`, `description`, `created_at`) VALUES
(1, 'amazom', 'it', '24554', 'q2435435', 'https://www.youtube.com/', 'sdfv ', '2026-03-21 18:04:35'),
(2, 'eargv', 'zsvf', 'afvzsbv', 'zvzds', '', 'gchn gchn', '2026-03-23 20:29:14');

-- --------------------------------------------------------

--
-- Stand-in structure for view `placedstudents`
-- (See below for the actual view)
--
CREATE TABLE `placedstudents` (
`usn` varchar(50)
,`full_name` varchar(100)
,`branch` varchar(255)
,`cgpa` decimal(3,2)
,`company_name` varchar(100)
,`job_title` varchar(100)
,`salary` decimal(10,2)
);

-- --------------------------------------------------------

--
-- Stand-in structure for view `studentapplicationsummary`
-- (See below for the actual view)
--
CREATE TABLE `studentapplicationsummary` (
`usn` varchar(50)
,`full_name` varchar(100)
,`branch` varchar(255)
,`cgpa` decimal(3,2)
,`total_applications` bigint(21)
,`accepted` bigint(21)
,`rejected` bigint(21)
,`pending` bigint(21)
);

-- --------------------------------------------------------

--
-- Table structure for table `students`
--

CREATE TABLE `students` (
  `student_id` int(11) NOT NULL,
  `full_name` varchar(100) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `cgpa` decimal(3,2) DEFAULT NULL,
  `skills` text DEFAULT NULL,
  `resume` varchar(255) DEFAULT NULL,
  `branch` varchar(255) DEFAULT 'Not Specified',
  `profile_photo` varchar(255) DEFAULT NULL,
  `usn` varchar(50) DEFAULT NULL,
  `neo_id` varchar(50) DEFAULT NULL,
  `campus` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `students`
--

INSERT INTO `students` (`student_id`, `full_name`, `email`, `cgpa`, `skills`, `resume`, `branch`, `profile_photo`, `usn`, `neo_id`, `campus`) VALUES
(1, 'Rahul Sharma', 'rahul@example.com', 8.50, 'HTML, CSS, Node.js', NULL, 'Not Specified', NULL, '4NI22CS001', NULL, NULL),
(2, 'Priya Patel', 'priya@example.com', 9.20, 'Python, SQL, Machine Learning', NULL, 'Not Specified', NULL, '4NI22CS002', NULL, NULL),
(3, 'rohan', 'student@gmail.com', 9.00, 'python', NULL, 'MECH', 'student_4_1774034633559.JPG', '4NI23IS027', NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `upcoming_companies`
--

CREATE TABLE `upcoming_companies` (
  `id` int(11) NOT NULL,
  `company_name` varchar(100) NOT NULL,
  `job_title` varchar(100) DEFAULT NULL,
  `visit_date` date NOT NULL,
  `required_cgpa` decimal(3,2) DEFAULT 0.00,
  `required_skills` text DEFAULT NULL,
  `allowed_branches` varchar(200) DEFAULT 'ALL',
  `description` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `upcoming_companies`
--

INSERT INTO `upcoming_companies` (`id`, `company_name`, `job_title`, `visit_date`, `required_cgpa`, `required_skills`, `allowed_branches`, `description`, `created_at`) VALUES
(1, 'fad', 'zfsdv', '2026-03-27', 9.99, '3egsdf', 'ALL', 'txhrfnf', '2026-03-22 11:13:07');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` varchar(50) DEFAULT 'admin',
  `resume` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `name`, `email`, `password`, `role`, `resume`) VALUES
(1, 'Admin', 'admin@example.com', 'admin123', 'admin', NULL),
(2, 'shrey', 'shreyashsuryavanshi2411@gmail.com', 'shreyash', 'admin', NULL),
(3, 'Admin', 'admin@gmail.com', '1234', 'admin', NULL),
(4, 'Student', 'student@gmail.com', '1234', 'student', 'student_4_resume_1774002905981.pdf'),
(39, 'Test User', 'testuser@example.com', 'password', 'student', NULL),
(40, 'rihan k', 'sdjghfkjdh@gmail.com', '12345', 'student', NULL);

-- --------------------------------------------------------

--
-- Structure for view `companywiseplacement`
--
DROP TABLE IF EXISTS `companywiseplacement`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `companywiseplacement`  AS SELECT `c`.`company_name` AS `company_name`, count(`a`.`application_id`) AS `total_applications`, count(case when `a`.`status` = 'Accepted' then 1 end) AS `placed_students`, round(avg(case when `a`.`status` = 'Accepted' then `a`.`salary` end),2) AS `avg_salary`, max(case when `a`.`status` = 'Accepted' then `a`.`salary` end) AS `max_salary` FROM ((`companies` `c` left join `jobs` `j` on(`c`.`company_id` = `j`.`company_id`)) left join `applications` `a` on(`j`.`job_id` = `a`.`job_id`)) GROUP BY `c`.`company_id`, `c`.`company_name` ;

-- --------------------------------------------------------

--
-- Structure for view `eligiblestudents`
--
DROP TABLE IF EXISTS `eligiblestudents`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `eligiblestudents`  AS SELECT `s`.`usn` AS `usn`, `s`.`full_name` AS `full_name`, `s`.`branch` AS `branch`, `s`.`cgpa` AS `cgpa`, `s`.`skills` AS `skills` FROM `students` AS `s` WHERE `s`.`cgpa` >= 7 AND !(`s`.`student_id` in (select `applications`.`student_id` from `applications` where `applications`.`status` = 'Accepted')) ;

-- --------------------------------------------------------

--
-- Structure for view `placedstudents`
--
DROP TABLE IF EXISTS `placedstudents`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `placedstudents`  AS SELECT `s`.`usn` AS `usn`, `s`.`full_name` AS `full_name`, `s`.`branch` AS `branch`, `s`.`cgpa` AS `cgpa`, `c`.`company_name` AS `company_name`, `j`.`job_title` AS `job_title`, `a`.`salary` AS `salary` FROM (((`students` `s` join `applications` `a` on(`s`.`student_id` = `a`.`student_id`)) join `jobs` `j` on(`a`.`job_id` = `j`.`job_id`)) join `companies` `c` on(`j`.`company_id` = `c`.`company_id`)) WHERE `a`.`status` = 'Accepted' ;

-- --------------------------------------------------------

--
-- Structure for view `studentapplicationsummary`
--
DROP TABLE IF EXISTS `studentapplicationsummary`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `studentapplicationsummary`  AS SELECT `s`.`usn` AS `usn`, `s`.`full_name` AS `full_name`, `s`.`branch` AS `branch`, `s`.`cgpa` AS `cgpa`, count(`a`.`application_id`) AS `total_applications`, count(case when `a`.`status` = 'Accepted' then 1 end) AS `accepted`, count(case when `a`.`status` = 'Rejected' then 1 end) AS `rejected`, count(case when `a`.`status` = 'Pending' then 1 end) AS `pending` FROM (`students` `s` left join `applications` `a` on(`s`.`student_id` = `a`.`student_id`)) GROUP BY `s`.`student_id` ;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `applications`
--
ALTER TABLE `applications`
  ADD PRIMARY KEY (`application_id`),
  ADD KEY `student_id` (`student_id`),
  ADD KEY `job_id` (`job_id`);

--
-- Indexes for table `application_history`
--
ALTER TABLE `application_history`
  ADD PRIMARY KEY (`history_id`);

--
-- Indexes for table `companies`
--
ALTER TABLE `companies`
  ADD PRIMARY KEY (`company_id`);

--
-- Indexes for table `jobs`
--
ALTER TABLE `jobs`
  ADD PRIMARY KEY (`job_id`),
  ADD KEY `company_id` (`company_id`);

--
-- Indexes for table `notifications`
--
ALTER TABLE `notifications`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `offcampus_jobs`
--
ALTER TABLE `offcampus_jobs`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `students`
--
ALTER TABLE `students`
  ADD PRIMARY KEY (`student_id`),
  ADD UNIQUE KEY `usn` (`usn`),
  ADD UNIQUE KEY `unique_usn` (`usn`);

--
-- Indexes for table `upcoming_companies`
--
ALTER TABLE `upcoming_companies`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `applications`
--
ALTER TABLE `applications`
  MODIFY `application_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=43;

--
-- AUTO_INCREMENT for table `application_history`
--
ALTER TABLE `application_history`
  MODIFY `history_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `companies`
--
ALTER TABLE `companies`
  MODIFY `company_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT for table `jobs`
--
ALTER TABLE `jobs`
  MODIFY `job_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- AUTO_INCREMENT for table `notifications`
--
ALTER TABLE `notifications`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `offcampus_jobs`
--
ALTER TABLE `offcampus_jobs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `students`
--
ALTER TABLE `students`
  MODIFY `student_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `upcoming_companies`
--
ALTER TABLE `upcoming_companies`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=41;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `applications`
--
ALTER TABLE `applications`
  ADD CONSTRAINT `applications_ibfk_1` FOREIGN KEY (`student_id`) REFERENCES `students` (`student_id`),
  ADD CONSTRAINT `applications_ibfk_2` FOREIGN KEY (`job_id`) REFERENCES `jobs` (`job_id`);

--
-- Constraints for table `jobs`
--
ALTER TABLE `jobs`
  ADD CONSTRAINT `jobs_ibfk_1` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`);

--
-- Constraints for table `notifications`
--
ALTER TABLE `notifications`
  ADD CONSTRAINT `notifications_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
