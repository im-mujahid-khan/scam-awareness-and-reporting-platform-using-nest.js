"use client";

import React, { useRef, useState, useEffect } from "react";
import {
  Button,
  Modal,
  Row,
  Col,
  Form,
  Alert,
  Spinner,
  ButtonGroup,
  Tab,
  Tabs,
  Badge,
} from "react-bootstrap";
import {
  FaBrush,
  FaEraser,
  FaSave,
  FaUndo,
  FaRedo,
  FaEye,
  FaEyeSlash,
  FaQuestionCircle,
  FaTimes,
  FaSearchPlus,
  FaSearchMinus,
  FaInfoCircle,
  FaMask,
  FaImage,
  FaExchangeAlt,
} from "react-icons/fa";

const ImageMaskingTool = ({
  imageUrl,
  onSave,
  onClose,
  show,
}) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const imageRef = useRef(null);
  const previewCanvasRef = useRef(null);

  const [brushSize, setBrushSize] = useState(20);
  const [blurIntensity, setBlurIntensity] = useState(15);
  const [mode, setMode] = useState("blur");
  const [isDrawing, setIsDrawing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const [maskCanvas, setMaskCanvas] = useState(null);
  const [maskCtx, setMaskCtx] = useState(null);
  const [originalImageData, setOriginalImageData] = useState(null);
  const [originalImageUrl, setOriginalImageUrl] = useState(null);

  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const [zoom, setZoom] = useState(1);

  const [activeTab, setActiveTab] = useState("edit");

  const lastPosRef = useRef({ x: 0, y: 0 });

  /* ================= INIT CANVAS ================= */

  useEffect(() => {
    if (!show || !imageUrl) return;

    const init = async () => {
      setIsLoading(true);

      const canvas = canvasRef.current;
      const previewCanvas = previewCanvasRef.current;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });

      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = imageUrl;

      img.onload = () => {
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        
        if (previewCanvas) {
          previewCanvas.width = img.naturalWidth;
          previewCanvas.height = img.naturalHeight;
        }

        ctx.drawImage(img, 0, 0);
        
        // Store the original image data for later use
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        setOriginalImageData(imageData);
        
        // Store the original image URL for preview
        setOriginalImageUrl(imageUrl);

        const mCanvas = document.createElement("canvas");
        mCanvas.width = canvas.width;
        mCanvas.height = canvas.height;
        const mCtx = mCanvas.getContext("2d");

        setMaskCanvas(mCanvas);
        setMaskCtx(mCtx);
        imageRef.current = img;
        setImageLoaded(true);

        saveToHistory(mCtx, mCanvas);
        setIsLoading(false);
      };

      img.onerror = () => {
        alert("Failed to load image");
        onClose();
      };
    };

    init();
  }, [show, imageUrl]);

  /* ================= HISTORY ================= */

  const saveToHistory = (ctx, canvas) => {
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(data);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  /* ================= DRAWING ================= */

  const getCanvasPoint = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();

    const clientX =
      e.touches?.[0]?.clientX ?? e.clientX;
    const clientY =
      e.touches?.[0]?.clientY ?? e.clientY;

    return {
      x: ((clientX - rect.left) / rect.width) * canvas.width,
      y: ((clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const startDrawing = (e) => {
    if (!imageLoaded || !maskCtx) return;
    setIsDrawing(true);
    lastPosRef.current = getCanvasPoint(e);
  };

  const draw = (e) => {
    if (!isDrawing || !maskCtx) return;
    const p = getCanvasPoint(e);

    maskCtx.lineWidth = brushSize;
    maskCtx.lineCap = "round";
    maskCtx.lineJoin = "round";

    if (mode === "blur") {
      maskCtx.globalCompositeOperation = "source-over";
      maskCtx.strokeStyle = "white";
    } else {
      maskCtx.globalCompositeOperation = "destination-out";
      maskCtx.strokeStyle = "white";
    }

    maskCtx.beginPath();
    maskCtx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
    maskCtx.lineTo(p.x, p.y);
    maskCtx.stroke();

    lastPosRef.current = p;
    updateCanvas();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    saveToHistory(maskCtx, maskCanvas);
  };

  /* ================= BLUR APPLY ================= */

  const updateCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    // Always start with the original image
    if (originalImageData) {
      ctx.putImageData(originalImageData, 0, 0);
    }

    const maskData = maskCtx.getImageData(
      0,
      0,
      canvas.width,
      canvas.height
    ).data;

    const blurCanvas = document.createElement("canvas");
    blurCanvas.width = canvas.width;
    blurCanvas.height = canvas.height;
    const blurCtx = blurCanvas.getContext("2d");

    blurCtx.putImageData(originalImageData, 0, 0);
    blurCtx.filter = `blur(${blurIntensity}px)`;
    blurCtx.drawImage(blurCanvas, 0, 0);

    const blurData = blurCtx.getImageData(
      0,
      0,
      canvas.width,
      canvas.height
    ).data;

    const imgData = ctx.getImageData(
      0,
      0,
      canvas.width,
      canvas.height
    );
    const pixels = imgData.data;

    for (let i = 0; i < pixels.length; i += 4) {
      if (maskData[i] > 0) {
        pixels[i] = blurData[i];
        pixels[i + 1] = blurData[i + 1];
        pixels[i + 2] = blurData[i + 2];
      }
    }

    ctx.putImageData(imgData, 0, 0);
    
    // Also update preview canvas when editing
    if (activeTab === "preview") {
      updatePreviewCanvas();
    }
  };

  /* ================= PREVIEW CANVAS ================= */

  const updatePreviewCanvas = () => {
    const canvas = canvasRef.current;
    const previewCanvas = previewCanvasRef.current;
    if (!previewCanvas || !canvas) return;

    const previewCtx = previewCanvas.getContext("2d");
    
    // Clear the preview canvas first
    previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
    
    // Draw the current canvas state (which contains the masked image) to preview canvas
    previewCtx.drawImage(canvas, 0, 0);
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    
    if (tab === "preview") {
      // Generate preview when switching to preview tab
      setTimeout(() => {
        updatePreviewCanvas();
      }, 100);
    }
  };

  /* ================= EVENTS ================= */

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleStart = (e) => {
      if (activeTab === "edit") {
        startDrawing(e);
      }
    };

    const handleMove = (e) => {
      if (activeTab === "edit" && isDrawing) {
        draw(e);
      }
    };

    const handleEnd = () => {
      if (activeTab === "edit") {
        stopDrawing();
      }
    };

    canvas.addEventListener("mousedown", handleStart);
    canvas.addEventListener("mousemove", handleMove);
    canvas.addEventListener("mouseup", handleEnd);
    canvas.addEventListener("mouseleave", handleEnd);

    return () => {
      canvas.removeEventListener("mousedown", handleStart);
      canvas.removeEventListener("mousemove", handleMove);
      canvas.removeEventListener("mouseup", handleEnd);
      canvas.removeEventListener("mouseleave", handleEnd);
    };
  });

  /* ================= SAVE ================= */

  const handleSave = async () => {
    try {
      // Get the final masked image as data URL
      const canvas = canvasRef.current;
      if (!canvas) {
        console.error("Canvas not available");
        return;
      }

      // Ensure canvas is updated with latest changes
      updateCanvas();
      
      // Get the image as data URL
      const dataUrl = canvas.toDataURL("image/png");
      
      // Create a blob from the data URL
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      
      // Create a file from the blob
      const file = new File([blob], "masked-image.png", { type: "image/png" });
      
      console.log("Generated masked image:", {
        dataUrl: dataUrl.substring(0, 100) + "...",
        fileSize: blob.size,
        fileType: file.type
      });

      // Call the onSave callback with the masked image data
      if (onSave && typeof onSave === 'function') {
        onSave({
          file: file,
          maskedDataUrl: dataUrl,
          blob: blob
        });
      } else {
        console.error("onSave callback is not a function");
      }
    } catch (error) {
      console.error("Error saving masked image:", error);
      alert("Failed to save masked image. Please try again.");
    }
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      const historyData = history[newIndex];
      
      maskCtx.putImageData(historyData, 0, 0);
      setHistoryIndex(newIndex);
      updateCanvas();
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      const historyData = history[newIndex];
      
      maskCtx.putImageData(historyData, 0, 0);
      setHistoryIndex(newIndex);
      updateCanvas();
    }
  };

  if (!show) return null;

  return (
    <Modal show={show} onHide={onClose} size="xl" centered>
      <Modal.Header closeButton>
        <Modal.Title>Blur Sensitive Information</Modal.Title>
      </Modal.Header>

      <Modal.Body className="p-0">
        <Tabs
          activeKey={activeTab}
          onSelect={handleTabChange}
          className="mb-3 px-3 pt-2"
          fill
        >
          <Tab eventKey="edit" title={
            <span>
              <FaBrush className="me-1" /> Edit Mode
            </span>
          }>
            <Row className="g-0">
              <Col lg={9}>
                <div
                  ref={containerRef}
                  className="bg-dark p-3"
                  style={{
                    height: "70vh",
                    overflow: "auto",
                  }}
                >
                  <canvas
                    ref={canvasRef}
                    style={{
                      transform: `scale(${zoom})`,
                      transformOrigin: "top left",
                      display: imageLoaded ? "block" : "none",
                      cursor: "crosshair",
                    }}
                  />
                  {isLoading && (
                    <div className="text-center text-light py-5">
                      <Spinner animation="border" variant="light" />
                      <p className="mt-2">Loading image...</p>
                    </div>
                  )}
                </div>
              </Col>

              <Col lg={3} className="p-3 bg-light border-start">
                <Alert variant="info" className="small mb-3">
                  <FaInfoCircle className="me-1" />
                  Draw over areas you want to blur. Use preview tab to see final result.
                </Alert>

                <div className="d-flex gap-2 mb-3">
                  <Button
                    variant={mode === "blur" ? "primary" : "outline-primary"}
                    onClick={() => setMode("blur")}
                    className="flex-grow-1"
                  >
                    <FaBrush className="me-1" /> Blur
                  </Button>
                  <Button
                    variant={mode === "erase" ? "danger" : "outline-danger"}
                    onClick={() => setMode("erase")}
                    className="flex-grow-1"
                  >
                    <FaEraser className="me-1" /> Erase
                  </Button>
                </div>

                <div className="d-flex gap-2 mb-3">
                  <Button
                    variant="outline-secondary"
                    onClick={handleUndo}
                    disabled={historyIndex <= 0}
                    className="flex-grow-1"
                  >
                    <FaUndo /> Undo
                  </Button>
                  <Button
                    variant="outline-secondary"
                    onClick={handleRedo}
                    disabled={historyIndex >= history.length - 1}
                    className="flex-grow-1"
                  >
                    <FaRedo /> Redo
                  </Button>
                </div>

                <Form.Group className="mb-3">
                  <Form.Label>
                    <strong>Brush Size</strong>
                  </Form.Label>
                  <Form.Range
                    min="5"
                    max="100"
                    value={brushSize}
                    onChange={(e) => setBrushSize(+e.target.value)}
                  />
                  <div className="text-center">
                    <small>{brushSize}px</small>
                  </div>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>
                    <strong>Blur Strength</strong>
                  </Form.Label>
                  <Form.Range
                    min="5"
                    max="30"
                    value={blurIntensity}
                    onChange={(e) => {
                      setBlurIntensity(+e.target.value);
                      updateCanvas();
                    }}
                  />
                  <div className="text-center">
                    <small>{blurIntensity}px</small>
                  </div>
                </Form.Group>

                <ButtonGroup className="mt-3 w-100">
                  <Button 
                    variant="outline-secondary"
                    onClick={() => setZoom((z) => Math.max(0.25, z - 0.25))}
                  >
                    <FaSearchMinus />
                  </Button>
                  <Button 
                    variant="outline-secondary"
                    onClick={() => setZoom(1)}
                  >
                    {Math.round(zoom * 100)}%
                  </Button>
                  <Button 
                    variant="outline-secondary"
                    onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
                  >
                    <FaSearchPlus />
                  </Button>
                </ButtonGroup>

                <Button
                  variant="warning"
                  className="w-100 mt-3"
                  onClick={() => handleTabChange("preview")}
                >
                  <FaEye className="me-1" /> Preview Before & After
                </Button>
              </Col>
            </Row>
          </Tab>

          <Tab eventKey="preview" title={
            <span>
              <FaEye className="me-1" /> Preview
            </span>
          }>
            <div className="p-3">
              <Alert variant="success" className="mb-3">
                <FaInfoCircle className="me-1" />
                <strong>Preview Mode:</strong> This is how your image will appear after saving. 
                The blurred areas will hide sensitive information.
              </Alert>
              
              <Row className="g-3">
                <Col md={6}>
                  <div className="card h-100">
                    <div className="card-header bg-light">
                      <h6 className="mb-0">
                        <FaImage className="me-2" />
                        <strong>Original Image</strong>
                      </h6>
                    </div>
                    <div className="card-body p-0">
                      <div
                        className="bg-dark p-2"
                        style={{
                          height: "400px",
                          overflow: "auto",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {originalImageUrl && (
                          <img
                            src={originalImageUrl}
                            alt="Original"
                            style={{
                              maxWidth: "100%",
                              maxHeight: "100%",
                              objectFit: "contain",
                            }}
                          />
                        )}
                      </div>
                    </div>
                    <div className="card-footer bg-light">
                      <small className="text-muted">This is the original, unedited image</small>
                    </div>
                  </div>
                </Col>
                
                <Col md={6}>
                  <div className="card h-100">
                    <div className="card-header bg-warning text-dark">
                      <h6 className="mb-0">
                        <FaMask className="me-2" />
                        <strong>Blurred Result</strong>
                        <Badge bg="danger" className="ms-2">
                          This is what will be saved
                        </Badge>
                      </h6>
                    </div>
                    <div className="card-body p-0">
                      <div
                        className="bg-dark p-2"
                        style={{
                          height: "400px",
                          overflow: "auto",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <canvas
                          ref={previewCanvasRef}
                          style={{
                            maxWidth: "100%",
                            maxHeight: "100%",
                            objectFit: "contain",
                            display: imageLoaded ? "block" : "none",
                          }}
                        />
                        {!imageLoaded && (
                          <div className="text-center text-light">
                            <Spinner animation="border" variant="light" />
                            <p className="mt-2">Generating preview...</p>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="card-footer bg-warning">
                      <small className="text-dark">
                        <strong>Note:</strong> Sensitive areas are blurred to protect privacy
                      </small>
                    </div>
                  </div>
                </Col>
              </Row>
              
              <div className="text-center mt-3">
                <Button
                  variant="secondary"
                  onClick={() => handleTabChange("edit")}
                  className="me-2"
                >
                  <FaExchangeAlt className="me-1" /> Back to Edit
                </Button>
                <Button
                  variant="success"
                  onClick={() => {
                    // Update preview one last time before showing final
                    updatePreviewCanvas();
                  }}
                >
                  <FaEye className="me-1" /> Refresh Preview
                </Button>
              </div>
            </div>
          </Tab>
        </Tabs>
      </Modal.Body>

      <Modal.Footer className="d-flex justify-content-between">
        <div>
          <Button variant="outline-secondary" onClick={onClose}>
            <FaTimes className="me-1" /> Cancel
          </Button>
        </div>
        <div>
          <Button 
            variant="outline-info" 
            onClick={() => handleTabChange(activeTab === "edit" ? "preview" : "edit")}
            className="me-2"
          >
            <FaExchangeAlt className="me-1" /> 
            {activeTab === "edit" ? "View Preview" : "Back to Edit"}
          </Button>
          <Button variant="primary" onClick={handleSave}>
            <FaSave className="me-1" /> Save & Use Image
          </Button>
        </div>
      </Modal.Footer>
    </Modal>
  );
};

export default ImageMaskingTool;