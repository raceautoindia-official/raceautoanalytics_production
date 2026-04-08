"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Card,
  Form,
  Select,
  Input,
  Button,
  Divider,
  Typography,
  Collapse,
  Upload,
  Image,
  Space,
  message,
  ConfigProvider,
  theme,
} from "antd";
import {
  UploadOutlined,
  SaveOutlined,
  PictureOutlined,
} from "@ant-design/icons";
import axios from "axios";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

import OverAllexcelUpload from "./overall/Overall";
import Overallbar from "./overall-2/Overallbar";
import TwoWheelerChartUploads from "./twowheeler/Overallpie";
import ThreeWheelerChartUpload from "./threewheeler/Threew";
import CommercialChartUploads from "./commercial-vehicle/Commercialoverall";
import TruckChartUpload from "./truck-overall/Truckoverall";
import BusChartUpload from "./bus/Bus";
import PassengerChartUpload from "./passenger/Passenger";
import TractorChartUpload from "./tractoroverall/Tractor-overall";
import Commercialsegment from "./commercial-segment/Commercialsegment";

const { Title, Text } = Typography;

const SegmentLabel: Record<string, string> = {
  overall: "Overall OEM",
  twowheeler: "Two-Wheeler",
  threewheeler: "Three-Wheeler",
  commercial_vehicle: "Commercial Vehicle",
  passenger_vehicle: "Passenger Vehicle",
  tractor: "Tractor",
  truck: "Truck",
  bus: "Bus",
  "construction-equipment": "Construction Equipment",
};

const segmentFields: Record<
  string,
  { name: string; label: string; max: number; isHeading?: boolean }[]
> = {
  overall: [
    { name: "overall_oem_main", label: "Overall OEM (Main)", max: 1000 },
    { name: "overall_oem_secondary", label: "Overall OEM (Secondary)", max: 1100 },
  ],
  twowheeler: [
    { name: "twowheeler", label: "Two-Wheeler", max: 1300 },
    {
      name: "highlighted_twowheeler",
      label: "Highlighted Two-Wheeler Heading",
      max: 100,
      isHeading: true,
    },
  ],
  threewheeler: [
    { name: "threewheeler", label: "Three-Wheeler", max: 1500 },
    {
      name: "highlighted_threewheeler",
      label: "Highlighted Three-Wheeler Heading",
      max: 100,
      isHeading: true,
    },
  ],
  commercial_vehicle: [
    { name: "commercial_vehicle", label: "Commercial Vehicle", max: 1500 },
    {
      name: "highlighted_commercial_vehicle",
      label: "Highlighted Commercial Vehicle Heading",
      max: 100,
      isHeading: true,
    },
  ],
  passenger_vehicle: [
    { name: "passenger_vehicle_main", label: "Passenger Vehicle (Main)", max: 1500 },
    {
      name: "passenger_vehicle_secondary",
      label: "Passenger Vehicle (Secondary)",
      max: 1100,
    },
    {
      name: "highlighted_passenger_vehicle",
      label: "Highlighted Passenger Vehicle Heading",
      max: 100,
      isHeading: true,
    },
  ],
  tractor: [
    { name: "tractor", label: "Tractor", max: 1700 },
    {
      name: "highlighted_tractor",
      label: "Highlighted Tractor Heading",
      max: 100,
      isHeading: true,
    },
  ],
  truck: [{ name: "truck", label: "Truck", max: 1600 }],
  bus: [{ name: "bus", label: "Bus", max: 1600 }],
  "construction-equipment": [
    {
      name: "construction_equipment",
      label: "Construction Equipment",
      max: 1600,
    },
    {
      name: "highlighted_construction_equipment",
      label: "Highlighted Construction Equipment Heading",
      max: 100,
      isHeading: true,
    },
  ],
};

function getTextLengthFromHtml(html = "") {
  if (!html) return 0;
  const div = document.createElement("div");
  div.innerHTML = html;
  const text = div.textContent || div.innerText || "";
  return text.length;
}

export default function TextEditor() {
  const [selectedSegment, setSelectedSegment] = useState("overall");
  const [selectedCountry, setSelectedCountry] = useState("india");
  const [countryOptions, setCountryOptions] = useState<
    { value: string; label: string }[]
  >([{ value: "india", label: "🇮🇳 India" }]);

  const [formData, setFormData] = useState<Record<string, any>>({});
  const [charCounts, setCharCounts] = useState<Record<string, number>>({});

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const [mobileImageFile, setMobileImageFile] = useState<File | null>(null);
  const [mobileImagePreview, setMobileImagePreview] = useState("");

  const [uploadingImage, setUploadingImage] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingCountryData, setLoadingCountryData] = useState(false);

  const quillModules = useMemo(
    () => ({ toolbar: [[{ color: [] }], ["bold", "italic", "underline"], ["clean"]] }),
    []
  );
  const quillFormats = useMemo(() => ["color", "bold", "italic", "underline"], []);

  useEffect(() => {
    const fetchCountries = async () => {
      try {
        const res = await axios.get("/api/flash-reports/countries");
        const rows = Array.isArray(res.data) ? res.data : [];

        const mapped = rows.map((item: any) => ({
          value: item.value,
          label: item.flag ? `${item.flag} ${item.label}` : item.label,
        }));

        if (mapped.length > 0) {
          setCountryOptions(mapped);
        }
      } catch (error) {
        console.error("Failed to load countries", error);
        setCountryOptions([{ value: "india", label: "🇮🇳 India" }]);
      }
    };

    fetchCountries();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoadingCountryData(true);

        const res = await axios.get(
          `/api/admin/flash-dynamic/flash-reports-text?country=${encodeURIComponent(
            selectedCountry
          )}`
        );

        const data = res.data || {};
        setFormData(data);

        const initialCounts: Record<string, number> = {};
        Object.entries(data).forEach(([key, html]) => {
          initialCounts[key] = getTextLengthFromHtml(String(html ?? ""));
        });
        setCharCounts(initialCounts);

        if (data?.main_banner_url) {
          setImagePreview(
            data.main_banner_url.startsWith("http")
              ? data.main_banner_url
              : `${process.env.NEXT_PUBLIC_S3_BUCKET_URL}${data.main_banner_url}`
          );
        } else {
          setImagePreview("");
        }

        if (data?.mobile_banner_url) {
          setMobileImagePreview(
            data.mobile_banner_url.startsWith("http")
              ? data.mobile_banner_url
              : `${process.env.NEXT_PUBLIC_S3_BUCKET_URL}${data.mobile_banner_url}`
          );
        } else {
          setMobileImagePreview("");
        }

        setImageFile(null);
        setMobileImageFile(null);
      } catch (error) {
        console.error("Failed to load country flash text", error);
        setFormData({});
        setCharCounts({});
        setImagePreview("");
        setMobileImagePreview("");
        message.error("Failed to load country data");
      } finally {
        setLoadingCountryData(false);
      }
    };

    fetchData();
  }, [selectedCountry]);

  const handleChange = (field: { name: string; max: number }, value: string) => {
    const count = getTextLengthFromHtml(value);

    setCharCounts((prev) => ({ ...prev, [field.name]: count }));

    if (count <= field.max) {
      setFormData((prev) => ({ ...prev, [field.name]: value }));
    }
  };

  const handleAdditionalHeadingChange = (value: string) => {
    const key = `${selectedSegment}_heading`;
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleAlternateFuelHeadingChange = (value: string) => {
    setFormData((prev) => ({ ...prev, alternative_fuel_heading: value }));
  };

  const beforeUploadDesktop = (file: File) => {
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    return false;
  };

  const beforeUploadMobile = (file: File) => {
    setMobileImageFile(file);
    setMobileImagePreview(URL.createObjectURL(file));
    return false;
  };

  const handleImageUpload = async () => {
    if (!imageFile && !mobileImageFile) {
      message.error("Please select at least one image to upload.");
      return;
    }

    setUploadingImage(true);
    const fd = new FormData();
    if (imageFile) fd.append("main_banner", imageFile);
    if (mobileImageFile) fd.append("mobile_banner", mobileImageFile);
    fd.append("country", selectedCountry);

    try {
      const res = await axios.put(`/api/admin/flash-dynamic/flash-image`, fd);

      if (res.data?.mainBannerUrl) {
        setFormData((prev) => ({ ...prev, main_banner_url: res.data.mainBannerUrl }));
        setImagePreview(
          res.data.mainBannerUrl.startsWith("http")
            ? res.data.mainBannerUrl
            : `${process.env.NEXT_PUBLIC_S3_BUCKET_URL}${res.data.mainBannerUrl}`
        );
      }

      if (res.data?.mobileBannerUrl) {
        setFormData((prev) => ({ ...prev, mobile_banner_url: res.data.mobileBannerUrl }));
        setMobileImagePreview(
          res.data.mobileBannerUrl.startsWith("http")
            ? res.data.mobileBannerUrl
            : `${process.env.NEXT_PUBLIC_S3_BUCKET_URL}${res.data.mobileBannerUrl}`
        );
      }

      setImageFile(null);
      setMobileImageFile(null);
      message.success(`Banner(s) uploaded successfully for ${selectedCountry}`);
    } catch {
      message.error("Image upload failed");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async () => {
    try {
      setSaving(true);

      const payload = {
        ...formData,
        country: selectedCountry,
      };

      delete payload.imageFile;

      await axios.post(`/api/admin/flash-dynamic/flash-reports-text`, payload);
      message.success(`Update saved successfully for ${selectedCountry}`);
    } catch (err: any) {
      message.error(err?.response?.data?.message || "Error saving data");
    } finally {
      setSaving(false);
    }
  };

  const segmentOptions = Object.entries(SegmentLabel).map(([key, label]) => ({
    value: key,
    label,
  }));

  return (
    <ConfigProvider theme={{ algorithm: theme.defaultAlgorithm }}>
      <style jsx global>{`
        .light-quill .ql-toolbar {
          background: #fff;
        }
        .light-quill .ql-container {
          background: #fff;
        }
        .light-quill .ql-editor {
          min-height: 140px;
        }
      `}</style>

      <Card style={{ maxWidth: 1100 }}>
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          <Title level={4} style={{ margin: 0 }}>
            Segment Market Update Editor
          </Title>

          <div>
            <Text type="secondary">Select Country</Text>
            <Select
              value={selectedCountry}
              onChange={setSelectedCountry}
              options={countryOptions}
              style={{ width: "100%", marginTop: 8 }}
              loading={loadingCountryData}
              showSearch
              optionFilterProp="label"
            />
          </div>

          <div>
            <Text type="secondary">Select Segment</Text>
            <Select
              value={selectedSegment}
              onChange={setSelectedSegment}
              options={segmentOptions}
              style={{ width: "100%", marginTop: 8 }}
            />
          </div>

          <Collapse
            items={[
              {
                key: "excel",
                label: "Upload Excel Data",
                children: (
                  <div>
                    {selectedSegment === "overall" && (
                      <>
                        <OverAllexcelUpload />
                        <Overallbar />
                      </>
                    )}
                    {selectedSegment === "twowheeler" && <TwoWheelerChartUploads />}
                    {selectedSegment === "threewheeler" && <ThreeWheelerChartUpload />}
                    {selectedSegment === "commercial_vehicle" && (
                      <>
                        <CommercialChartUploads />
                        <Commercialsegment />
                      </>
                    )}
                    {selectedSegment === "truck" && <TruckChartUpload />}
                    {selectedSegment === "bus" && <BusChartUpload />}
                    {selectedSegment === "passenger_vehicle" && <PassengerChartUpload />}
                    {selectedSegment === "tractor" && <TractorChartUpload />}
                  </div>
                ),
              },
            ]}
          />

          <Form layout="vertical" onFinish={handleSubmit}>
            <Form.Item label="Flash Report Edition Name">
              <Input
                value={formData.flash_reports_edition || ""}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, flash_reports_edition: e.target.value }))
                }
                placeholder="Enter edition name, e.g., May 2025"
              />
            </Form.Item>

            {(segmentFields[selectedSegment] || []).map((field) => {
              const count = charCounts[field.name] || 0;
              const over = count > field.max;

              return (
                <div key={field.name} style={{ marginBottom: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                    <Text>
                      {field.label} (Max: {field.max} characters)
                    </Text>
                    <Text type={over ? "danger" : "secondary"}>
                      {count} / {field.max} {over ? "— Limit exceeded!" : ""}
                    </Text>
                  </div>

                  <div style={{ marginTop: 8 }} className="light-quill">
                    <ReactQuill
                      theme="snow"
                      value={formData[field.name] || ""}
                      onChange={(val) => handleChange(field, val)}
                      modules={quillModules}
                      formats={quillFormats}
                      placeholder={`Enter ${field.label.toLowerCase()}...`}
                    />
                  </div>
                </div>
              );
            })}

            <Form.Item label={`${SegmentLabel[selectedSegment]} Additional Heading`}>
              <Input
                value={formData[`${selectedSegment}_heading`] || ""}
                onChange={(e) => handleAdditionalHeadingChange(e.target.value)}
              />
            </Form.Item>

            {selectedSegment === "overall" && (
              <Form.Item label="Alternate Fuel Heading">
                <Input
                  value={formData.alternative_fuel_heading || ""}
                  onChange={(e) => handleAlternateFuelHeadingChange(e.target.value)}
                />
              </Form.Item>
            )}

            <Divider />

            <Title level={5} style={{ margin: 0 }}>
              Upload Banner Images
            </Title>

            <Space direction="vertical" size={12} style={{ width: "100%" }}>
              <div>
                <Text>
                  <PictureOutlined /> Upload Desktop Banner
                </Text>
                <div style={{ marginTop: 8 }}>
                  <Upload
                    accept="image/*"
                    maxCount={1}
                    beforeUpload={beforeUploadDesktop}
                    showUploadList={{ showRemoveIcon: true }}
                    onRemove={() => {
                      setImageFile(null);
                      setImagePreview("");
                    }}
                  >
                    <Button icon={<UploadOutlined />}>Choose Desktop Image</Button>
                  </Upload>
                </div>
                {imagePreview ? (
                  <div style={{ marginTop: 12 }}>
                    <Image src={imagePreview} width={250} />
                  </div>
                ) : null}
              </div>

              <div>
                <Text>
                  <PictureOutlined /> Upload Mobile Banner
                </Text>
                <div style={{ marginTop: 8 }}>
                  <Upload
                    accept="image/*"
                    maxCount={1}
                    beforeUpload={beforeUploadMobile}
                    showUploadList={{ showRemoveIcon: true }}
                    onRemove={() => {
                      setMobileImageFile(null);
                      setMobileImagePreview("");
                    }}
                  >
                    <Button icon={<UploadOutlined />}>Choose Mobile Image</Button>
                  </Upload>
                </div>
                {mobileImagePreview ? (
                  <div style={{ marginTop: 12 }}>
                    <Image src={mobileImagePreview} width={150} />
                  </div>
                ) : null}
              </div>

              <Button
                onClick={handleImageUpload}
                loading={uploadingImage}
                icon={<UploadOutlined />}
              >
                Upload Banner Images
              </Button>

              <Divider />

              <Button
                type="primary"
                htmlType="submit"
                block
                size="large"
                loading={saving}
                icon={<SaveOutlined />}
              >
                Save Final Market Update
              </Button>
            </Space>
          </Form>
        </Space>
      </Card>
    </ConfigProvider>
  );
}