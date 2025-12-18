'use client';

import React from 'react';
import ErrorMessage from '@/components/atoms/ErrorMessage';
import type { Scene } from '@/types/shop';

interface SceneSelectorProps {
  scenes: Scene[];
  selectedScenes: string[];
  customSceneText: string;
  validationErrors: Record<string, string>;
  onScenesChange: (sceneIds: string[]) => void;
  onCustomTextChange: (text: string) => void;
  onValidationErrorChange: (field: string, error: string | null) => void;
}

export default function SceneSelector({
  scenes,
  selectedScenes,
  customSceneText,
  validationErrors,
  onScenesChange,
  onCustomTextChange,
  onValidationErrorChange,
}: SceneSelectorProps) {
  const handleSceneToggle = (sceneId: string, checked: boolean) => {
    if (checked) {
      onScenesChange([...selectedScenes, sceneId]);
    } else {
      const newScenes = selectedScenes.filter(id => id !== sceneId);
      onScenesChange(newScenes);
      // 「その他」のチェックを外したらカスタムテキストもクリア
      const otherScene = scenes.find(s => s.name === 'その他');
      if (otherScene && sceneId === otherScene.id) {
        onCustomTextChange('');
        onValidationErrorChange('customSceneText', null);
      }
    }
  };

  const handleCustomTextBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const otherScene = scenes.find(s => s.name === 'その他');
    const isOtherSelected = otherScene && selectedScenes.includes(otherScene.id);
    if (isOtherSelected) {
      if (!e.target.value || e.target.value.trim().length === 0) {
        onValidationErrorChange('customSceneText', '具体的な利用シーンを入力してください');
      } else if (e.target.value.length > 100) {
        onValidationErrorChange('customSceneText', '具体的な利用シーンは100文字以内で入力してください');
      } else {
        onValidationErrorChange('customSceneText', null);
      }
    }
  };

  const handleCustomTextInput = (e: React.FormEvent<HTMLInputElement>) => {
    const target = e.target as HTMLInputElement;
    const otherScene = scenes.find(s => s.name === 'その他');
    const isOtherSelected = otherScene && selectedScenes.includes(otherScene.id);
    if (isOtherSelected) {
      if (target.value.length > 100) {
        onValidationErrorChange('customSceneText', '具体的な利用シーンは100文字以内で入力してください');
      } else if (target.value.trim().length === 0) {
        onValidationErrorChange('customSceneText', '具体的な利用シーンを入力してください');
      } else {
        onValidationErrorChange('customSceneText', null);
      }
    }
  };

  const otherScene = scenes.find(s => s.name === 'その他');
  const isOtherSelected = otherScene && selectedScenes.includes(otherScene.id);

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">利用シーン（複数選択可）</h2>
      
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {scenes.map((scene) => (
            <label
              key={scene.id}
              className="flex items-center space-x-2 cursor-pointer"
            >
              <input
                type="checkbox"
                value={scene.id}
                checked={selectedScenes.includes(scene.id)}
                onChange={(e) => handleSceneToggle(scene.id, e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">{scene.name}</span>
            </label>
          ))}
        </div>
        
        {/* 「その他」選択時のカスタムテキスト入力欄 */}
        {isOtherSelected && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              具体的な利用シーン <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="customSceneText"
              value={customSceneText}
              onChange={(e) => onCustomTextChange(e.target.value)}
              onBlur={handleCustomTextBlur}
              onInput={handleCustomTextInput}
              maxLength={100}
              placeholder="例：歓送迎会、忘年会など"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                validationErrors.customSceneText ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            <ErrorMessage message={validationErrors.customSceneText} />
            <p className="mt-1 text-xs text-gray-500">
              「その他」を選択した場合は、具体的な利用シーンを入力してください（最大100文字）
            </p>
          </div>
        )}
      </div>
    </div>
  );
}


