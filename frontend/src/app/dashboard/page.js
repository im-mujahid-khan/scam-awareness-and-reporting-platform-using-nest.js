"use client";

import {
  Container,
  Row,
  Col,
  Card,
  Button,
  Badge,
  Spinner,
  Alert,
  ProgressBar,
} from "react-bootstrap";
import {
  FaExclamationTriangle,
  FaShieldAlt,
  FaComment,
  FaChartLine,
  FaUsers,
  FaGlobe,
  FaClock,
  FaBuilding,
  FaCalendarAlt,
  FaEye,
  FaCheckCircle,
  FaStar,
  FaRocket,
  FaArrowRight,
  FaPlus,
  FaNewspaper,
  FaBookmark,
  FaHistory,
  FaUserCheck,
  FaChartBar,
  FaBell,
  FaUserPlus,
  FaHashtag,
} from "react-icons/fa";
import { useState, useEffect } from "react";
import { useAuth } from "../../../lib/contexts/AuthContext";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import Link from "next/link";
import DashboardLayout from "../../../components/layout/DashboardLayout";

export default function DashboardPage() {
  const { user, api, isAuthenticated } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalPosts: 0,
    scamReports: 0,
    awarenessPosts: 0,
    questions: 0,
    publishedPosts: 0,
    pendingReview: 0,
    totalGroups: 0,
    groupMembers: 0,
    following: 0,
    followers: 0,
  });

  const [recentActivity, setRecentActivity] = useState([]);
  const [myGroups, setMyGroups] = useState([]);
  const [trendingTopics, setTrendingTopics] = useState([]);

  // Check authentication immediately
  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/auth/login?callbackUrl=/dashboard');
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated && user) {
      loadDashboardData();
    }
  }, [isAuthenticated, user]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Load user stats
      try {
        const postsResponse = await api.posts.getMyPosts();
        const posts = postsResponse || [];

        const userStats = {
          totalPosts: posts.length,
          scamReports: posts.filter((p) => p.postType === "SCAM_REPORT").length,
          awarenessPosts: posts.filter((p) => p.postType === "SCAM_AWARENESS")
            .length,
          questions: posts.filter((p) => p.postType === "QUESTION").length,
          publishedPosts: posts.filter((p) => p.status === "PUBLISHED").length,
          pendingReview: posts.filter((p) => p.status === "UNDER_REVIEW").length,
        };

        setStats((prev) => ({ ...prev, ...userStats }));
      } catch (postsError) {
        console.error("Failed to load posts for stats:", postsError);
      }

      // Load user groups
      try {
        const groupsResponse = await api.groups.getMyGroups();
        const groups = Array.isArray(groupsResponse)
          ? groupsResponse
          : groupsResponse.data || groupsResponse.groups || [];

        setMyGroups(groups.slice(0, 5));
        setStats((prev) => ({
          ...prev,
          totalGroups: groups.length,
        }));
      } catch (groupsError) {
        console.error("Failed to load groups:", groupsError);
      }

      // Load recent activity (simulated)
      const mockActivity = [
        {
          id: 1,
          type: "POST_CREATED",
          title: "Created a scam awareness post",
          description: "Shared information about the latest phishing techniques",
          time: "2 hours ago",
          icon: FaShieldAlt,
          color: "warning",
        },
        {
          id: 2,
          type: "GROUP_JOINED",
          title: "Joined Crypto Scam Awareness Group",
          description: "Now a member of 500+ person community",
          time: "1 day ago",
          icon: FaUsers,
          color: "primary",
        },
        {
          id: 3,
          type: "POST_LIKED",
          title: "Liked a scam report",
          description: "Supported community report about investment fraud",
          time: "2 days ago",
          icon: FaStar,
          color: "success",
        },
        {
          id: 4,
          type: "COMMENT_ADDED",
          title: "Commented on a question",
          description: "Shared your experience with tech support scams",
          time: "3 days ago",
          icon: FaComment,
          color: "info",
        },
      ];
      setRecentActivity(mockActivity);

      // Load trending topics (simulated)
      const mockTopics = [
        { tag: "#TechSupportScam", posts: 245, trend: "up" },
        { tag: "#PhishingAlert", posts: 189, trend: "up" },
        { tag: "#CryptoFraud", posts: 312, trend: "steady" },
        { tag: "#OnlineSafety", posts: 467, trend: "up" },
        { tag: "#RomanceScam", posts: 128, trend: "up" },
      ];
      setTrendingTopics(mockTopics);
    } catch (error) {
      console.error("Failed to load dashboard data:", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num) => {
    return num.toLocaleString();
  };

  const getBadgeColor = (trend) => {
    switch (trend) {
      case "up":
        return "success";
      case "down":
        return "danger";
      default:
        return "secondary";
    }
  };

  const getTrendIcon = (trend) => {
    switch (trend) {
      case "up":
        return "↗️";
      case "down":
        return "↘️";
      default:
        return "➡️";
    }
  };

  // Show loading while checking authentication
  if (!isAuthenticated) {
    return (
      <DashboardLayout>
        <Container fluid className="py-5">
          <Row className="justify-content-center">
            <Col md={8} className="text-center">
              <div className="py-5">
                <Spinner
                  animation="border"
                  variant="primary"
                  style={{ width: "3rem", height: "3rem" }}
                />
                <p className="mt-4 text-muted fs-5">
                  Checking authentication...
                </p>
              </div>
            </Col>
          </Row>
        </Container>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Container fluid className="py-4">
        {/* Header Section */}
        <Row className="justify-content-center mb-4">
          <Col xl={12}>
            <div className="text-center mb-5">
              <h1 className="fw-bold mb-2 display-5" style={{ color: "#2d3748" }}>
                Welcome back, {user?.displayName?.split(" ")[0] || "User"}! 
              </h1>
              <p className="text-muted mb-0 fs-6">
                Stay informed and protect yourself from online scams
              </p>
            </div>
          </Col>
        </Row>

        {loading ? (
          <Row className="justify-content-center">
            <Col md={8} className="text-center">
              <div className="py-5">
                <Spinner
                  animation="border"
                  variant="primary"
                  style={{ width: "3rem", height: "3rem" }}
                />
                <p className="mt-4 text-muted fs-5">
                  Loading your dashboard...
                </p>
              </div>
            </Col>
          </Row>
        ) : (
          <>
            {/* Quick Stats Cards */}
            <Row className="g-4 mb-4">
              <Col xl={3} lg={6}>
                <Card
                  className="border-0 shadow-sm h-100 rounded-4"
                  style={{
                    border: "1px solid rgba(102, 126, 234, 0.2)",
                    background:
                      "linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%)",
                  }}
                >
                  <Card.Body className="p-4">
                    <div className="d-flex align-items-start mb-3">
                      <div
                        className="p-3 rounded-3 me-3"
                        style={{
                          background:
                            "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                        }}
                      >
                        <FaNewspaper className="text-white" size={20} />
                      </div>
                      <div>
                        <h6 className="fw-semibold mb-1">Total Posts</h6>
                        <p className="text-muted small mb-0">
                          Your contributions to the community
                        </p>
                      </div>
                    </div>
                    <h2 className="fw-bold mb-0" style={{ color: "#2d3748" }}>
                      {stats.totalPosts}
                    </h2>
                  </Card.Body>
                </Card>
              </Col>

              <Col xl={3} lg={6}>
                <Card
                  className="border-0 shadow-sm h-100 rounded-4"
                  style={{
                    border: "1px solid rgba(245, 158, 11, 0.2)",
                    background:
                      "linear-gradient(135deg, rgba(245, 158, 11, 0.05) 0%, rgba(217, 119, 6, 0.05) 100%)",
                  }}
                >
                  <Card.Body className="p-4">
                    <div className="d-flex align-items-start mb-3">
                      <div
                        className="p-3 rounded-3 me-3"
                        style={{
                          background:
                            "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)",
                        }}
                      >
                        <FaShieldAlt className="text-white" size={20} />
                      </div>
                      <div>
                        <h6 className="fw-semibold mb-1">Scam Reports</h6>
                        <p className="text-muted small mb-0">
                          Reports you've submitted
                        </p>
                      </div>
                    </div>
                    <h2 className="fw-bold mb-0" style={{ color: "#2d3748" }}>
                      {stats.scamReports}
                    </h2>
                  </Card.Body>
                </Card>
              </Col>

              <Col xl={3} lg={6}>
                <Card
                  className="border-0 shadow-sm h-100 rounded-4"
                  style={{
                    border: "1px solid rgba(16, 185, 129, 0.2)",
                    background:
                      "linear-gradient(135deg, rgba(16, 185, 129, 0.05) 0%, rgba(5, 150, 105, 0.05) 100%)",
                  }}
                >
                  <Card.Body className="p-4">
                    <div className="d-flex align-items-start mb-3">
                      <div
                        className="p-3 rounded-3 me-3"
                        style={{
                          background:
                            "linear-gradient(135deg, #10B981 0%, #059669 100%)",
                        }}
                      >
                        <FaUsers className="text-white" size={20} />
                      </div>
                      <div>
                        <h6 className="fw-semibold mb-1">Groups Joined</h6>
                        <p className="text-muted small mb-0">
                          Communities you're part of
                        </p>
                      </div>
                    </div>
                    <h2 className="fw-bold mb-0" style={{ color: "#2d3748" }}>
                      {stats.totalGroups}
                    </h2>
                  </Card.Body>
                </Card>
              </Col>

              <Col xl={3} lg={6}>
                <Card
                  className="border-0 shadow-sm h-100 rounded-4"
                  style={{
                    border: "1px solid rgba(239, 68, 68, 0.2)",
                    background:
                      "linear-gradient(135deg, rgba(239, 68, 68, 0.05) 0%, rgba(220, 38, 38, 0.05) 100%)",
                  }}
                >
                  <Card.Body className="p-4">
                    <div className="d-flex align-items-start mb-3">
                      <div
                        className="p-3 rounded-3 me-3"
                        style={{
                          background:
                            "linear-gradient(135deg, #EF4444 0%, #DC2626 100%)",
                        }}
                      >
                        <FaExclamationTriangle className="text-white" size={20} />
                      </div>
                      <div>
                        <h6 className="fw-semibold mb-1">Pending Review</h6>
                        <p className="text-muted small mb-0">
                          Posts awaiting approval
                        </p>
                      </div>
                    </div>
                    <h2 className="fw-bold mb-0" style={{ color: "#2d3748" }}>
                      {stats.pendingReview}
                    </h2>
                  </Card.Body>
                </Card>
              </Col>
            </Row>

            {/* Main Content Area */}
            <Row className="g-4">
              {/* Left Column - Quick Actions & Trending */}
              <Col lg={4}>
                {/* Quick Actions */}
                <Card className="border-0 shadow-sm mb-4 rounded-4">
                  <Card.Body className="p-4">
                    <h5 className="fw-semibold mb-4" style={{ color: "#2d3748" }}>
                      Quick Actions
                    </h5>

                    <div className="d-grid gap-3">
                      <Button
                        variant="primary"
                        onClick={() => router.push("/report")}
                        className="py-3 rounded-pill border-0"
                        style={{
                          background:
                            "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                        }}
                      >
                        <FaExclamationTriangle className="me-2" />
                        Report a Scam
                      </Button>

                      <Button
                        variant="outline-primary"
                        onClick={() => router.push("/report")}
                        className="py-3 rounded-pill border-0"
                        style={{
                          background:
                            "linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)",
                          border: "1px solid #e9ecef",
                          color: "#667eea",
                        }}
                      >
                        <FaShieldAlt className="me-2" />
                        Share Awareness
                      </Button>

                      <Button
                        variant="outline-secondary"
                        onClick={() => router.push("/report")}
                        className="py-3 rounded-pill border-0"
                        style={{
                          background:
                            "linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)",
                          border: "1px solid #e9ecef",
                          color: "#6B7280",
                        }}
                      >
                        <FaComment className="me-2" />
                        Ask a Question
                      </Button>
                    </div>
                  </Card.Body>
                </Card>

                {/* Trending Topics */}
                <Card className="border-0 shadow-sm mb-4 rounded-4">
                  <Card.Body className="p-4">
                    <div className="d-flex justify-content-between align-items-center mb-4">
                      <h5 className="fw-semibold mb-0" style={{ color: "#2d3748" }}>
                        <FaHashtag className="me-2 text-primary" />
                        Trending Topics
                      </h5>
                      <Badge
                        bg="primary"
                        className="py-1 px-2 rounded-pill border-0"
                      >
                        Live
                      </Badge>
                    </div>

                    <div className="d-flex flex-column gap-3">
                      {trendingTopics.map((topic, index) => (
                        <div
                          key={index}
                          className="d-flex justify-content-between align-items-center p-3 rounded-3 hover-light"
                          style={{
                            background: "#f8f9fa",
                            cursor: "pointer",
                            transition: "all 0.2s ease",
                          }}
                        >
                          <div>
                            <h6 className="fw-semibold mb-1">{topic.tag}</h6>
                            <small className="text-muted">
                              {formatNumber(topic.posts)} posts
                            </small>
                          </div>
                          <Badge
                            bg={getBadgeColor(topic.trend)}
                            className="py-1 px-2 rounded-pill border-0"
                          >
                            {getTrendIcon(topic.trend)}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </Card.Body>
                </Card>

                {/* Recent Activity */}
                <Card className="border-0 shadow-sm rounded-4">
                  <Card.Body className="p-4">
                    <div className="d-flex justify-content-between align-items-center mb-4">
                      <h5 className="fw-semibold mb-0" style={{ color: "#2d3748" }}>
                        <FaHistory className="me-2 text-primary" />
                        Recent Activity
                      </h5>
                      <Button
                        variant="link"
                        className="p-0 text-primary"
                        onClick={loadDashboardData}
                      >
                        Refresh
                      </Button>
                    </div>

                    <div className="d-flex flex-column gap-3">
                      {recentActivity.map((activity) => {
                        const IconComponent = activity.icon;
                        return (
                          <div
                            key={activity.id}
                            className="d-flex align-items-start gap-3 p-3 rounded-3 hover-light"
                            style={{
                              background: "#f8f9fa",
                              transition: "all 0.2s ease",
                            }}
                          >
                            <div
                              className="p-2 rounded-3 flex-shrink-0"
                              style={{
                                background: `linear-gradient(135deg, var(--bs-${activity.color}) 0%, rgba(var(--bs-${activity.color}-rgb), 0.7) 100%)`,
                                color: "white",
                              }}
                            >
                              <IconComponent size={16} />
                            </div>
                            <div className="flex-grow-1">
                              <h6 className="fw-semibold mb-1 small">
                                {activity.title}
                              </h6>
                              <p className="text-muted small mb-0">
                                {activity.description}
                              </p>
                              <small className="text-muted">{activity.time}</small>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </Card.Body>
                </Card>
              </Col>

              {/* Right Column - Groups & Insights */}
              <Col lg={8}>
                {/* My Groups Section */}
                <Card className="border-0 shadow-sm mb-4 rounded-4">
                  <Card.Body className="p-4">
                    <div className="d-flex justify-content-between align-items-center mb-4">
                      <h5 className="fw-semibold mb-0" style={{ color: "#2d3748" }}>
                        <FaUsers className="me-2 text-primary" />
                        My Groups
                      </h5>
                      <Button
                        variant="outline-primary"
                        size="sm"
                        onClick={() => router.push("/dashboard/groups")}
                        className="rounded-pill border-0"
                        style={{
                          background:
                            "linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)",
                          border: "1px solid #e9ecef",
                          color: "#667eea",
                        }}
                      >
                        <FaArrowRight className="me-2" />
                        View All
                      </Button>
                    </div>

                    {myGroups.length === 0 ? (
                      <Alert variant="info" className="border-0">
                        <div className="text-center py-4">
                          <FaUsers className="text-muted mb-3" style={{ fontSize: "3rem" }} />
                          <h6>No Groups Yet</h6>
                          <p className="text-muted mb-3">
                            Join groups to connect with communities focused on specific
                            scam types
                          </p>
                          <Button
                            variant="primary"
                            onClick={() => router.push("/dashboard/groups")}
                            className="rounded-pill"
                          >
                            <FaUserPlus className="me-2" />
                            Explore Groups
                          </Button>
                        </div>
                      </Alert>
                    ) : (
                      <Row className="g-4">
                        {myGroups.map((group) => (
                          <Col key={group.id} md={6}>
                            <Card
                              className="border-0 shadow-sm h-100 rounded-4 hover-lift"
                              style={{ transition: "all 0.3s ease", cursor: "pointer" }}
                              onClick={() =>
                                router.push(`/dashboard/groups/${group.slug || group.id}`)
                              }
                            >
                              <Card.Body className="p-3">
                                <div className="d-flex align-items-start mb-3">
                                  <div
                                    className="p-2 rounded-3 me-3 flex-shrink-0"
                                    style={{
                                      background:
                                        "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                                      color: "white",
                                    }}
                                  >
                                    <FaUsers size={16} />
                                  </div>
                                  <div className="flex-grow-1">
                                    <h6 className="fw-semibold mb-1 text-truncate">
                                      {group.name}
                                    </h6>
                                    <small className="text-muted">
                                      {group.members_count || group.memberCount || 0}{" "}
                                      members
                                    </small>
                                  </div>
                                </div>
                                <p className="text-muted small mb-0 text-truncate">
                                  {group.description || "No description"}
                                </p>
                              </Card.Body>
                            </Card>
                          </Col>
                        ))}
                      </Row>
                    )}
                  </Card.Body>
                </Card>

                {/* Insights & Analytics */}
                <Card className="border-0 shadow-sm rounded-4">
                  <Card.Body className="p-4">
                    <h5 className="fw-semibold mb-4" style={{ color: "#2d3748" }}>
                      <FaChartBar className="me-2 text-primary" />
                      Your Insights
                    </h5>

                    <Row className="g-4">
                      <Col md={6}>
                        <Card className="border-0 shadow-sm h-100 rounded-4">
                          <Card.Body className="p-4">
                            <h6 className="fw-semibold mb-3">Post Distribution</h6>
                            <div className="d-flex flex-column gap-3">
                              <div>
                                <div className="d-flex justify-content-between mb-1">
                                  <span className="small">Scam Reports</span>
                                  <span className="small fw-semibold">
                                    {stats.scamReports}
                                  </span>
                                </div>
                                <ProgressBar
                                  variant="danger"
                                  now={(stats.scamReports / stats.totalPosts) * 100 || 0}
                                  className="rounded-pill"
                                  style={{ height: "6px" }}
                                />
                              </div>
                              <div>
                                <div className="d-flex justify-content-between mb-1">
                                  <span className="small">Awareness Posts</span>
                                  <span className="small fw-semibold">
                                    {stats.awarenessPosts}
                                  </span>
                                </div>
                                <ProgressBar
                                  variant="warning"
                                  now={(stats.awarenessPosts / stats.totalPosts) * 100 || 0}
                                  className="rounded-pill"
                                  style={{ height: "6px" }}
                                />
                              </div>
                              <div>
                                <div className="d-flex justify-content-between mb-1">
                                  <span className="small">Questions</span>
                                  <span className="small fw-semibold">
                                    {stats.questions}
                                  </span>
                                </div>
                                <ProgressBar
                                  variant="primary"
                                  now={(stats.questions / stats.totalPosts) * 100 || 0}
                                  className="rounded-pill"
                                  style={{ height: "6px" }}
                                />
                              </div>
                            </div>
                          </Card.Body>
                        </Card>
                      </Col>

                      <Col md={6}>
                        <Card className="border-0 shadow-sm h-100 rounded-4">
                          <Card.Body className="p-4">
                            <h6 className="fw-semibold mb-3">Engagement Metrics</h6>
                            <div className="d-flex flex-column gap-4">
                              <div className="d-flex align-items-center justify-content-between">
                                <div className="d-flex align-items-center gap-3">
                                  <div
                                    className="p-2 rounded-3"
                                    style={{
                                      background:
                                        "linear-gradient(135deg, #10B981 0%, #059669 100%)",
                                      color: "white",
                                    }}
                                  >
                                    <FaCheckCircle size={16} />
                                  </div>
                                  <div>
                                    <h6 className="fw-semibold mb-0">
                                      {stats.publishedPosts}
                                    </h6>
                                    <small className="text-muted">Published Posts</small>
                                  </div>
                                </div>
                                <Badge bg="success" className="rounded-pill">
                                  Active
                                </Badge>
                              </div>

                              <div className="d-flex align-items-center justify-content-between">
                                <div className="d-flex align-items-center gap-3">
                                  <div
                                    className="p-2 rounded-3"
                                    style={{
                                      background:
                                        "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)",
                                      color: "white",
                                    }}
                                  >
                                    <FaClock size={16} />
                                  </div>
                                  <div>
                                    <h6 className="fw-semibold mb-0">
                                      {stats.pendingReview}
                                    </h6>
                                    <small className="text-muted">Under Review</small>
                                  </div>
                                </div>
                                <Badge bg="warning" className="rounded-pill">
                                  Pending
                                </Badge>
                              </div>
                            </div>
                          </Card.Body>
                        </Card>
                      </Col>
                    </Row>

                    {/* Quick Tips */}
                    <div className="mt-4 pt-4 border-top">
                      <h6 className="fw-semibold mb-3">Quick Safety Tips</h6>
                      <div className="d-flex flex-column gap-3">
                        <div className="d-flex align-items-start gap-3 p-3 rounded-3 bg-light">
                          <FaShieldAlt className="text-primary mt-1" />
                          <div>
                            <h6 className="fw-semibold small mb-1">
                              Verify Before You Trust
                            </h6>
                            <p className="text-muted small mb-0">
                              Always verify the identity of people or organizations
                              before sharing personal information.
                            </p>
                          </div>
                        </div>
                        <div className="d-flex align-items-start gap-3 p-3 rounded-3 bg-light">
                          <FaExclamationTriangle className="text-warning mt-1" />
                          <div>
                            <h6 className="fw-semibold small mb-1">
                              Watch for Red Flags
                            </h6>
                            <p className="text-muted small mb-0">
                              Urgency, secrecy requests, and too-good-to-be-true offers
                              are common scam tactics.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          </>
        )}
      </Container>
    </DashboardLayout>
  );
}